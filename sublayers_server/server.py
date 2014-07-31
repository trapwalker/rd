#!/usr/bin/env python

import logging.config
logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)

import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
import os.path
from tornado.options import define, options

from model.event_machine import LocalServer

from client_connector import AgentSocketHandler

define("port", default=80, help="run on the given port", type=int)
# todo: logging config file path define as tornado option


class Application(tornado.web.Application):
    def __init__(self):
        log.info('\n' + '=-' * 70 + '\nAPPLICATION STARTED\n' + '--' * 70)
        self.srv = LocalServer(app=self)
        self.srv.start()
        self.clients = []
        self.chat = []
        # todo: tuncate chat history

        self.init_scene()

        handlers = [
            #(r"/", MainHandler),
            (r"/", tornado.web.RedirectHandler, {"url": "/static/view.html"}),
            (r"/ws", AgentSocketHandler),
        ]
        settings = dict(
            cookie_secret="DxlHE6Da0NEVpSqtboSeaEntH5F7Yc2e",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=True,
        )
        tornado.web.Application.__init__(self, handlers, **settings)

    def stop(self):
        self.srv.stop()
        tornado.ioloop.IOLoop.instance().stop()

    def init_scene(self):
        from model.units import Bot
        from model.vectors import Point
        #b = Bot(server=self.srv, position=Point(0, 0))
        #b.goto(Point(1000, 1500))
        

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html", messages=[])


def main():
    import socket
    tornado.options.parse_config_file('server.conf', final=False)
    try:
        tornado.options.parse_config_file('server.local.conf', final=False)
    except IOError as e:
        log.warning('Local configuration file load FAIL: %s', e)
    else:
        log.info('Local configuration file load OK')
    tornado.options.parse_command_line(final=True)
    app = Application()
    try:
        app.listen(options.port)
    except socket.error as e:
        log.critical(e)
        print e
    else:
        tornado.ioloop.IOLoop.instance().start()

    globals().update(app=app, srv=app.srv)


if __name__ == "__main__":
    main()
