# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.websocket
from model.agent_api import AgentAPI


class AgentSocketHandler(tornado.websocket.WebSocketHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def open(self):
        self.user_id = self.get_secure_cookie("user")
        log.info('!!! Open User connection: %s', self.user_id)
        self.agent = self.application.srv.api.get_agent(self.user_id, make=True)  # todo: Change to make=False
        self.agent.connection = self
        self.api = AgentAPI(agent=self.agent)

    def on_close(self):
        log.info('Agent %r socket Closed', self)
        #self.agent.connection = None

    def on_message(self, message):
        log.info("got message %r", message)
        result = self.api.__rpc_call__(message)
        self.write_message(result)
