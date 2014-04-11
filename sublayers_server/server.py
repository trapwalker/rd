#!/usr/bin/env python
#
# Copyright 2009 Facebook
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
"""Simplified chat demo for websockets.

Authentication, error handling, etc are left as an exercise for the reader :)
"""

import logging
import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
import os.path
import uuid
from tornado.options import define, options

from model.event_machine import LocalServer
from client_connector import AgentSocketHandler

define("port", default=80, help="run on the given port", type=int)


class Application(tornado.web.Application):
    def __init__(self):
        self.srv = LocalServer(app=self)
        self.client_socket_handler = AgentSocketHandler.make_bind_class(self.srv)
        self.srv.start()

        handlers = [
            (r"/", MainHandler),
            (r"/chatsocket", self.client_socket_handler),
        ]
        settings = dict(
            cookie_secret="DxlHE6Da0NEVpSqtboSeaEntH5F7Yc2e",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=True,
        )
        tornado.web.Application.__init__(self, handlers, **settings)

    def stop(self):
        tornado.ioloop.IOLoop.instance().stop()


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html", messages=[])


def main():
    tornado.options.parse_command_line()
    app = Application()
    app.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG, filename='server.log')
    pass
    main()
