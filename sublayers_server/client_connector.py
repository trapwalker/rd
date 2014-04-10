# -*- coding: utf-8 -*-
import tornado.websocket

from model.agents import User


class Connector(object):

    server = None  # need to override attribute

    def __init__(self):
        super(Connector, self).__init__()
        self.agent = User(server=self.server, connection=self)
        # todo: Auth agent
        # todo: Recognize type of agent (User, AI, anything else?)
        # todo: Search existing agent instance in the server world model

    def send(self, message, binary=False):
        raise NotImplementedError

    def on_message(self, message):
        raise NotImplementedError

    def ping(self, data):
        raise NotImplementedError

    def on_pong(self, data):
        pass

    def on_close(self):
        pass


class SocketHandler(tornado.websocket.WebSocketHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def open(self):
        user_id = self.get_secure_cookie("user")



class TornadoWebsocketConnection(Connector):

    def __init__(self, handler):
        super(TornadoWebsocketConnection, self).__init__()
        self.handler = handler

    def send(self, message, binary=False):
        self.handler.write_message(message, binary)


