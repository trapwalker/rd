#!/usr/bin/env python

import logging.config
logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)

import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
import os
import os.path
import secrets
from tornado.options import define, options

from model.editor_server import EditorServer

from sublayers_editor.client_connector import ClientSocketHandler

define("port", default=80, help="run on the given port", type=int)
# todo: logging config file path define as tornado option


class Application(tornado.web.Application):
    def __init__(self):
        log.info('\n' + '=-' * 70 + '\nAPPLICATION STARTED\n' + '--' * 70)
        self.srv = EditorServer(app=self)

        self.clients = []

        handlers = [
            (r"/", tornado.web.RedirectHandler, {"url": "static/editor.html"}),
            (r"/ws", ClientSocketHandler),
        ]
        settings = dict(
            # No fixed default on purpose - this was a hardcoded secret
            # committed to a public repo. Set EDITOR_COOKIE_SECRET to keep
            # sessions stable across restarts; otherwise a fresh one is
            # generated each run (editor sessions just won't persist).
            cookie_secret=os.environ.get('EDITOR_COOKIE_SECRET') or secrets.token_hex(32),
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
        print(e)
    else:
        tornado.ioloop.IOLoop.instance().start()

    globals().update(app=app)


if __name__ == "__main__":
    main()
