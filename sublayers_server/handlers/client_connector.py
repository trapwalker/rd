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
        assert user

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
            # todo: Разобраться с этой странной редкой ошибкой. Почему-то дек буффера торнадо оказывается пустым
            self.write_message(data)
        except Exception as e:
            log.exception('Fucking scarry deque error (%r) with data=%r', e, data)
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
        d = json.loads(data)
        if d['number'] == self.ping_number - 1:
            self._current_ping = round((t - d['time']) * 1000, 0)
            assert self._current_ping >= 0, 'current_time={}  ping_time={} ping={} number={}'.format(t, d['time'], self._current_ping, d['number'])
