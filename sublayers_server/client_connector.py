# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


import tornado.websocket
import tornado.escape
import uuid


class AgentSocketHandler(tornado.websocket.WebSocketHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def open(self):
        logging.debug('Agent socket Opened')
        self.user_id = self.get_secure_cookie("user")
        self.agent = self.application.srv.get_agent(self.user_id, make=True)  # todo: Change to make=False
        self.agent.connection = self

    def on_close(self):
        logging.debug('Agent socket Closed')
        self.agent.connection = None

    def on_message(self, message):
        logging.info("got message %r", message)
        parsed = tornado.escape.json_decode(message)
        chat = {
            "id": str(uuid.uuid4()),
            "body": parsed["body"],
        }
        chat["html"] = tornado.escape.to_basestring(
            self.render_string("message.html", message=chat))



