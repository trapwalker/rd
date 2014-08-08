# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.websocket
from model.agent_api import AgentAPI, make_push_package
from model.utils import serialize


class AgentSocketHandler(tornado.websocket.WebSocketHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def open(self):
        self.user_id = self.get_secure_cookie("user")
        log.info('!!! Open User connection: %s', self.user_id)
        self.agent = self.application.srv.api.get_agent(self.user_id, make=True)  # todo: Change to make=False
        self.agent.connection = self
        self.application.clients.append(self)
        self.api = AgentAPI(agent=self.agent)

        if self.application.chat:
            package = make_push_package(self.application.chat)  # todo: slice to chunks
            log.debug('Send to agent %s: %r', self.agent, package)
            self.write_message(serialize(package))

    def on_close(self):
        log.info('Agent %r socket Closed', self)
        self.application.clients.remove(self)
        self.agent.connection = None
        while self.agent.cars:
            self.agent.cars.pop().delete()

    def on_message(self, message):
        log.debug("Got message from %s: %r", self.agent, message)
        result = self.api.__rpc_call__(message)
        self.write_message(result)
