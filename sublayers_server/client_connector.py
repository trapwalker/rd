# -*- coding: utf-8 -*-
import tornado.websocket

from model.agents import User


class ConnectorProxy(object):

    user_id = None

    def __init__(self):
        super(ConnectorProxy, self).__init__()
        self.agent = self.get_user()
        self.agent.connection = self
        if hasattr(self.agent, 'on_disconnect'):
            self.on_close = self.agent.on_disconnect

        # todo: Auth agent
        # todo: Recognize type of agent (User, AI, anything else?)
        # todo: Search existing agent instance in the server world model

    def get_user(self):
        raise NotImplementedError

    def on_message(self, handler, message):
        self.agent.on_message(message)

    def send(self, message, binary=False):
        raise NotImplementedError

    def on_close(self, handler):
        pass


class SocketHandler(tornado.websocket.WebSocketHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def open(self):
        _proxy = TornadoWebsocketConnection(self)
        _proxy.user_id = self.get_secure_cookie("user")



class TornadoWebsocketConnection(ConnectorProxy):

    def __init__(self, handler):
        super(TornadoWebsocketConnection, self).__init__()
        self.handler = handler

    def send(self, message, binary=False):
        self.handler.write_message(message, binary)
