#!/usr/bin/env python
from __future__ import absolute_import

import sys, os

def parent_folder(fn):
    return os.path.abspath(os.path.join(os.path.dirname(fn), '..'))

sys.path.append(parent_folder(__file__))

import logging.config
logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)

import tornado.escape
import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.options
from tornado.options import options
import socket

from sublayers_server import settings
from sublayers_server import service_tools

from sublayers_server import uimodules
from sublayers_server.handlers.static import StaticFileHandlerPub
from sublayers_server.handlers.client_connector import AgentSocketHandler
from sublayers_server.handlers.pages import MainHandler
from sublayers_server.handlers.auth import AuthLoginHandler, AuthGoogleHandler, AuthLogoutHandler

from sublayers_server.model.event_machine import LocalServer


class Application(tornado.web.Application):
    def __init__(self):
        log.info('\n' + '=-' * 70 + '\nGAME ENGINE SERVICE STARTED\n' + '--' * 70)
        self.srv = LocalServer(app=self)
        self.srv.start()
        self.clients = []
        self.chat = []
        # todo: tuncate chat history

        self.init_scene()

        handlers = [
            #(r"/", MainHandler),
            (r"/edit", tornado.web.RedirectHandler, {"url": "/static/editor.html", "permanent": False}),
            (r"/", tornado.web.RedirectHandler, {"url": "/static/view.html", "permanent": False}),
            (r"/ws", AgentSocketHandler),
            (r"/static/(.*)", StaticFileHandlerPub),
            (r"/play", MainHandler),

            (r"/auth/login", AuthLoginHandler),
            (r"/auth/login/google", AuthGoogleHandler),
            (r"/auth/logout", AuthLogoutHandler),
        ]
        app_settings = dict(
            cookie_secret=options.cookie_secret,
            template_path=options.template_path,
            static_path=options.static_path,
            xsrf_cookies=True,
            ui_modules=uimodules,
            login_url="/",
            debug=True,
        )
        tornado.web.Application.__init__(self, handlers, **app_settings)

    def stop(self):
        log.debug('====== ioloop before stop')
        tornado.ioloop.IOLoop.instance().stop()
        log.debug('====== ioloop after stop')

    def on_stop(self):
        if self.srv.is_active:
            self.srv.stop()

    def init_scene(self):
        #from model.units import Bot
        from sublayers_server.model.vectors import Point
        from sublayers_server.model.first_mission_parties import WinTrigger
        WinTrigger(server=self.srv, position=Point(29527, 14612), observing_range=600)
        # todo: map metadata store to DB


def main():
    settings.load('server.conf')
    service_tools.pidfile_save(options.pidfile)
    app = Application()
    #service_tools.set_terminate_handler(app.stop)
    try:
        app.listen(options.port)
    except socket.error as e:
        log.critical(e)
        print e
    except Exception as e:
        log.critical(e)
        print e
    else:
        log.debug('====== ioloop before start')
        tornado.ioloop.IOLoop.instance().start()
        log.debug('====== ioloop after start')
    finally:
        log.debug('====== finally before stop')
        app.stop()
        log.debug('====== finally after stop')


if __name__ == "__main__":
    main()
