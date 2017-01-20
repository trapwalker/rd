# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

import json
import tornado.ioloop
import tornado.websocket
import tornado.web
import tornado.gen

from sublayers_common.handlers.base import BaseHandler

from tornado.options import options

from random import randint

from sublayers_common.user_profile import User


class AgentSocketHandler(tornado.websocket.WebSocketHandler, BaseHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def check_origin(self, origin):
        log.warning('origin=%s', origin)
        # todo: reject connections from wrong servers
        return True

    @tornado.gen.coroutine
    def open(self):
        # todo: make agent_init event
        print 'new connect open !!!'
        self._ping_timeout_handle = None
        self.ping_number = 0
        self.agent = None
        user = self.current_user
        assert user
        log.info('!!! Open User connection: %s%s', self.current_user, user.quick)
        self.application.clients.append(self)
        # log.debug('Cookies: %s', self.cookies)
        srv = self.application.srv
        agent = None

        if options.mode == 'basic':
            if not user.quick:
                agent = yield srv.api.get_agent(user, make=True, do_disconnect=True)  # todo: Change to make=False
        elif options.mode == 'quick':
            agent = yield srv.api.get_agent_teaching(user, do_disconnect=True)  # todo: Change to make=False

        if agent is None:
            log.warning('Agent not found in database')  # todo: ##fixit
            return
        self.agent = agent
        agent.on_connect(connection=self)
        agent.logging_agent(self.request.headers["User-Agent"])
        self._do_ping()

    def on_close(self):
        if self._ping_timeout_handle:
            log.debug('Cancel ping for agent {}'.format(self.agent))
            tornado.ioloop.IOLoop.instance().remove_timeout(self._ping_timeout_handle)
            self._ping_timeout_handle = None

        if self.agent:
            log.info('Agent socket %r Closed', self)
            self.agent.on_disconnect(self)
        else:
            log.warning('Socket Closed. Socket %r has not agent', self)
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

    def _do_ping(self):
        t = self.application.srv.get_time()
        # log.debug('Send ping packet #{self.ping_number} at {t} to {self.agent}'.format(self=self, t=t))
        self.ping(json.dumps(dict(time=t, number=self.ping_number)))
        self.ping_number += 1
        self._ping_timeout_handle = tornado.ioloop.IOLoop.instance().call_later(29, self._do_ping)  # todo: const 29