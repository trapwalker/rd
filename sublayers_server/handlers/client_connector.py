# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

import json
import tornado.ioloop
import tornado.websocket
import tornado.web
from tornado.options import options

from sublayers_common.handlers.base import BaseHandler


WS_PING_INTERVAL = 25  # (сек.) интервал пинга клиента через веб-сокет.


class AgentSocketHandler(tornado.websocket.WebSocketHandler, BaseHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def check_origin(self, origin):
        log.warning('origin=%s  # todo: reject connections from wrong servers', origin)
        return True

    def open(self):
        # todo: make agent_init event
        self._ping_timeout_handle = None
        self.ping_number = 0
        self._current_ping = 0
        self.agent = None
        user = self.current_user
        if user is None:
            log.warning('Unauthorized websocket connection rejected')
            self.close(code=4401, reason='Not authenticated')
            return

        if user.is_banned:
            log.warning('%s banned before %s  (reason: %s)', user, user.ban_time, user.ban_reason)
            self.close(reason='User is Banned')
            return

        if self.application.srv.is_closed_for_agents:
            log.warning('Server Closed')
            self.close(reason='Server Closed')
            return

        log.info('!!! Open client connection: %s (mode: %s)', self.current_user, 'quick' if user.quick else 'basic')
        self.application.clients.append(self)
        # log.debug('Cookies: %s', self.cookies)
        srv = self.application.srv
        agent = None

        if options.mode == 'basic':
            if not user.quick:
                agent = srv.api.get_agent(user, make=True, do_disconnect=True)  # todo: Change to make=False
        elif options.mode == 'quick':
            agent = srv.api.get_agent_teaching(user, do_disconnect=True)  # todo: Change to make=False

        if agent is None:
            log.warning('Agent not found in database')  # todo: ##fixit
            return

        time = agent.server.get_time()
        if time < agent.min_connection_time:
            self.close(reason='min_connection_time')
            return
        self.agent = agent
        agent.on_connect(connection=self)
        agent.log.info(self.request.headers["User-Agent"])
        self._do_ping()

        self.on_timer_for_stat()

    def on_close(self):
        log.info('Socket %r closed (agent=%s)', self, self.agent)
        self._disable_ping()

        if self.agent:
            self.agent.on_disconnect(self)

        if self in self.application.clients:
            self.application.clients.remove(self)

    def on_message(self, message):
        # log.debug("Got message from %s: %r", self.agent, message)
        result = self.agent.api.__rpc_call__(message)
        self.send(result)

    def send(self, data):
        #log.debug('\n\nconnection.send(%s)', data)
        try:
            self.write_message(data)
        except tornado.websocket.WebSocketClosedError:
            # Клиент отвалился между постановкой сообщения в очередь и отправкой —
            # штатная гонка. Пробрасывать нельзя: исключение прерывало рассылку
            # остальной очереди сообщений всем агентам в event_loop.
            log.warning('Message to closed connection dropped (agent=%s)', self.agent)
        except Exception as e:
            log.exception('Websocket send error (%r) with data=%r', e, data)
            raise e

    def _disable_ping(self):
        if self._ping_timeout_handle:
            log.debug('Ping cancel for agent {}'.format(self.agent))
            tornado.ioloop.IOLoop.instance().remove_timeout(self._ping_timeout_handle)
            self._ping_timeout_handle = None
        else:
            log.warning('Ping already cancelled for agent {}'.format(self.agent))

    def _do_ping(self):
        t = self.application.srv.get_time()
        # log.debug('Send ping packet #{self.ping_number} at {t} to {self.agent}'.format(self=self, t=t))
        if not self.ws_connection:
            log.warning('Connection lost during ping is active (number=%s, agent=%s)', self.ping_number, self.agent)
            self._disable_ping()
            return

        self.ping(json.dumps(dict(time=t, number=self.ping_number)))
        self.ping_number += 1
        self._ping_timeout_handle = tornado.ioloop.IOLoop.instance().call_later(WS_PING_INTERVAL, self._do_ping)

    def on_pong(self, data):
        t = self.application.srv.get_time()
        try:
            d = json.loads(data)
            ping_time = d['time']
            ping_number = d['number']
        except (ValueError, TypeError, KeyError) as e:
            log.warning('Malformed pong payload from agent %s: %r (%s)', self.agent, data, e)
            return

        if ping_number == self.ping_number - 1:
            self._current_ping = max(round((t - ping_time) * 1000, 0), 0)
