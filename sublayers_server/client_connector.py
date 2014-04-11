# -*- coding: utf-8 -*-
import tornado.websocket
import tornado.escape
import uuid
import logging

class AgentSocketHandler(tornado.websocket.WebSocketHandler):
    server = None

    @classmethod
    def make_bind_class(cls, server):
        return type('{}_bound'.format(cls.__name__), (cls,), dict(server=server))

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def open(self):
        self.user_id = self.get_secure_cookie("user")
        self.agent = self.server.get_user(self.user_id)
        self.agent.connection = self

    def on_close(self):
        del self.agent.connection

    def on_message(self, message):
        logging.info("got message %r", message)
        parsed = tornado.escape.json_decode(message)
        chat = {
            "id": str(uuid.uuid4()),
            "body": parsed["body"],
        }
        chat["html"] = tornado.escape.to_basestring(
            self.render_string("message.html", message=chat))



