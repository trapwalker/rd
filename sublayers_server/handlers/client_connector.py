# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

import tornado.websocket

from sublayers_server.handlers.base import BaseHandler


class AgentSocketHandler(tornado.websocket.WebSocketHandler, BaseHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def check_origin(self, origin):
        log.warning('origin=%s', origin)
        # todo: reject connections from wrong servers
        return True

    def open(self):
        # todo: make agent_init event
        self.agent = None
        user = self.current_user
        assert user
        log.info('!!! Open User connection: %s%s', self.current_user, user.quick)
        self.application.clients.append(self)
        # log.debug('Cookies: %s', self.cookies)
        srv = self.application.srv

        agent = None
        if user.is_quick_user:
            agent = srv.api.get_agent_quick_game(user, do_disconnect=True)  # todo: Change to make=False
        else:
            agent = srv.api.get_agent(user, make=True, do_disconnect=True)  # todo: Change to make=False

        if agent is None:
            log.warning('Agent not found in database')  # todo: ##fixit
            return

        self.agent = agent
        agent.on_connect(connection=self)

    def on_close(self):
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
