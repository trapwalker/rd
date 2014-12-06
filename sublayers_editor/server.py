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

from model.editor_server import EditorServer

from client_connector import ClientSocketHandler

define("port", default=80, help="run on the given port", type=int)
# todo: logging config file path define as tornado option


class Application(tornado.web.Application):
    def __init__(self):
        log.info('\n' + '=-' * 70 + '\nAPPLICATION STARTED\n' + '--' * 70)
        self.srv = EditorServer(app=self)

        self.clients = []

        handlers = [
            (r"/", tornado.web.RedirectHandler, {"url": "/view.html"}),
            (r"/ws", ClientSocketHandler),
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

    globals().update(app=app)


if __name__ == "__main__":
    main()
