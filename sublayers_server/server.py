#!/usr/bin/env python

import logging.config
logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)

import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
import signal
import os
from tornado.options import define, options

from website.static import StaticFileHandlerPub
from website.main import MainHandler
from website import uimodules
from model.event_machine import LocalServer

from client_connector import AgentSocketHandler

define("static_path", default=os.path.join(os.path.dirname(__file__), "static"), help="path to static files", type=str)
define("pidfile", default=None, help="filename for pid store", type=str)
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
            (r"/", MainHandler),
            (r"/edit", tornado.web.RedirectHandler, {"url": "/static/editor.html"}),
            #(r"/", tornado.web.RedirectHandler, {"url": "/static/view.html"}),
            (r"/ws", AgentSocketHandler),
            (r"/static/(.*)", StaticFileHandlerPub),
        ]
        settings = dict(
            cookie_secret="DxlHE6Da0NEVpSqtboSeaEntH5F7Yc2e",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=options.static_path,
            xsrf_cookies=True,
            ui_modules = uimodules,
        )
        tornado.web.Application.__init__(self, handlers, **settings)

    def stop(self):
        log.debug('====== ioloop before stop')
        tornado.ioloop.IOLoop.instance().stop()
        log.debug('====== ioloop after stop')

    def on_stop(self):
        if self.srv.is_active:
            self.srv.stop()

    def init_scene(self):
        #from model.units import Bot
        from model.vectors import Point
        from model.first_mission_parties import WinTrigger
        WinTrigger(server=self.srv, position=Point(29527, 14612), observing_range=600)
        # todo: map metadata store to DB

        #b = Bot(server=self.srv, position=Point(0, 0))
        #b.goto(Point(1000, 1500))


def main():
    import socket

    def on_exit(sig, func=None):
        print '====== terminate', sig, func
        log.debug('====== exit handler triggered')
        app.stop()

    signal.signal(signal.SIGTERM, on_exit)

    tornado.options.parse_config_file('server.conf', final=False)
    try:
        tornado.options.parse_config_file('server.local.conf', final=False)
    except IOError as e:
        log.warning('Local configuration file load FAIL: %s', e)
    else:
        log.info('Local configuration file load OK')
    tornado.options.parse_command_line(final=True)

    pid = os.getpid()
    log.info('Service started with PID=%s', pid)
    if options.pidfile:
        try:
            with open(options.pidfile, 'w') as f_pid:
                f_pid.write(str(pid))
        except Exception as e:
            log.error("[FAIL] Can't store PID into the file '%s': %s", options.pidfile, e)
        else:
            log.info("[DONE] PID stored into the file '%s'", options.pidfile)

    app = Application()
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
