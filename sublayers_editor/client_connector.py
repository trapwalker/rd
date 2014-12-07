# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.websocket
from model.client_api import ClientAPI
from model.clients import Client


class ClientSocketHandler(tornado.websocket.WebSocketHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def open(self):
        self.user_id = self.get_secure_cookie("user")
        log.info('!!! Open User connection: %s', self.user_id)
        client = Client(connection=self, srv=self.application.srv)
        self.api = ClientAPI(client=client)
        self.application.clients.append(self)


    def on_close(self):
        log.info('Client %r socket Closed', self)
        self.application.clients.remove(self)
        self.api.client.connection = None

    def on_message(self, message):
        log.info("Got message from %r", message)
        self.api.__rpc_call__(message)
        #self.send(result)

    def send(self, data):
        #log.debug('\n\nconnection.send(%s)', data)
        self.write_message(data)