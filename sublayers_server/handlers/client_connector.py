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

    def open(self):
        # todo: make agent_init event
        self.user_id = self.get_secure_cookie("user")
        log.info('!!! Open User connection: %s', self.user_id)
        log.debug('Cookies: %s', self.cookies)
        srv = self.application.srv
        agent = srv.api.get_agent(self.user_id, make=True)  # todo: Change to make=False
        self.agent = agent
        agent.connection = self
        self.application.clients.append(self)
        self.api = AgentAPI(agent=agent)

        # todo: extract chat logic from here
        for message_params in self.application.chat:
            srv.post_message(messages.Chat(agent=agent, **message_params))
            # todo: otimize - slice and send chat history by chunks

    def on_close(self):
        # todo: removing car from worldmap by disconnect
        log.info('Agent %r socket Closed', self)
        self.application.clients.remove(self)
        self.agent.connection = None
        while self.agent.cars:
            car = self.agent.cars.pop()
            if car.is_alive:
                car.delete()

    def on_message(self, message):
        log.debug("Got message from %s: %r", self.agent, message)
        result = self.api.__rpc_call__(message)
        self.send(result)

    def send(self, data):
        #log.debug('\n\nconnection.send(%s)', data)
        self.write_message(data)