# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

import tornado.websocket

from sublayers_server.model.agent_api import AgentAPI
from sublayers_server.model import messages


class AgentSocketHandler(tornado.websocket.WebSocketHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def check_origin(self, origin):
        log.warning('origin=%s', origin)
        # todo: reject connections from wrong servers
        return True

    def open(self):
        # todo: make agent_init event
        self.user_id = self.get_secure_cookie("user")
        self.agent = None
        log.info('!!! Open User connection: %s', self.user_id)
        self.application.clients.append(self)
        # log.debug('Cookies: %s', self.cookies)
        srv = self.application.srv
        agent = srv.api.get_agent(self.user_id, make=True, do_disconnect=True)  # todo: Change to make=False
        if agent is None:
            log.warn('Agent not found in database')
            return
        log.info('Agent %r socket Init', self)
        self.agent = agent
        agent.connection = self
        if agent.api:
            self.api = agent.api
            agent.api.update_agent_api()
        else:
            self.api = AgentAPI(agent=agent)

        # обновление статистики по онлайну агентов
        srv.stat_log.s_agents_on(time=srv.get_time(), delta=1.0)

    def on_close(self):
        if self.agent:
            log.info('Agent socket %r Closed', self)
            self.agent.on_disconnect(self)
        else:
            log.warn('Socket Closed. Socket %r has not agent', self)
        self.application.clients.remove(self)


    def on_message(self, message):
        # log.debug("Got message from %s: %r", self.agent, message)
        result = self.api.__rpc_call__(message)
        self.send(result)

    def send(self, data):
        #log.debug('\n\nconnection.send(%s)', data)
        self.write_message(data)