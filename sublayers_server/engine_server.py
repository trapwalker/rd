#!/usr/bin/env python
# -*- coding: utf-8 -*-
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
from sublayers_server.handlers.pages import PlayHandler
from sublayers_server.handlers.main_car_info import MainCarInfoHandler
from sublayers_server.handlers.main_menu_nucoil import MainMenuNucoilHandler
from sublayers_server.handlers.party_handler import PartyHandler
from sublayers_server.handlers.town import TownHandler
from sublayers_server.handlers.site.site_handler import SiteHandler
from sublayers_server.handlers.site.site_auth import SiteLoginHandler, SiteLogoutHandler, GoogleLoginHandler, \
    StandardLoginHandler, OKLoginHandler, VKLoginHandler
from sublayers_server.handlers.statistics import ServerStatisticsHandler, ServerStatisticsRefreshHandler
from sublayers_server.model.event_machine import LocalServer


try:
    from pymongo import Connection
except ImportError:
    from pymongo import MongoClient as Connection


class Application(tornado.web.Application):
    def __init__(self):
        try:
            self.revision = service_tools.HGRevision()
        except Exception as e:
            self.revision = None
            log.warning("Can't get HG revision info: %s", e)

        self.db_connection = None
        self.auth_db = None

        try:
            self.db_connection = Connection()
        except:
            log.warn('MongoDB not found')

        if self.db_connection:
            self.auth_db = self.db_connection.auth_db
        else:
            self.auth_db = None

        log.info('\n' + '=-' * 70 + '\nGAME ENGINE SERVICE STARTED %s\n' + '--' * 70, self.revision)
        self.srv = LocalServer(app=self)
        self.srv.start()
        self.clients = []
        self.chat = []
        # todo: tuncate chat history

        self.srv.init_scene()

        handlers = [
            (r"/", SiteHandler),
            (r"/edit", tornado.web.RedirectHandler, {"url": "/static/editor.html", "permanent": False}),
            (r"/ws", AgentSocketHandler),
            (r"/static/(.*)", StaticFileHandlerPub),
            (r"/play", PlayHandler),

            (r"/login", SiteLoginHandler),
            (r"/logout", SiteLogoutHandler),
            (r"/login/standard", StandardLoginHandler),
            (r"/login/google", GoogleLoginHandler),
            (r"/login/ok", OKLoginHandler),
            (r"/login/vk", VKLoginHandler),

            (r"/stat", ServerStatisticsHandler),
            (r"/server_stat_refresh", ServerStatisticsRefreshHandler),

            (r"/api/town", TownHandler),
            (r"/api/main_car_info", MainCarInfoHandler),
            (r"/api/main_menu_nucoil", MainMenuNucoilHandler),
            (r"/api/party", PartyHandler),
        ]
        app_settings = dict(
            cookie_secret=options.cookie_secret,
            template_path=options.template_path,
            static_path=options.static_path,
            xsrf_cookies=True,
            ui_modules=uimodules,
            login_url="/login",
            debug=True,
            autoreload=False,
            google_oauth={"key": "106870863695-ofsuq4cf087mj5n83s5h8mfknnudkm4k.apps.googleusercontent.com",
                          "secret": "JOXGxpPxKGqr_9TYW9oYT8g_"},
            ok_oauth={"key": "1137609984",
                      "secret": "BB413D7F8E6B685D19AE3FE0",
                      "public_key": "CBAOIPMEEBABABABA"},
            vk_oauth={"key": "4926489",
                      "secret": "4gyveXhKv5aVNCor5bkB"},
        )
        tornado.web.Application.__init__(self, handlers, **app_settings)

    def stop(self):
        log.debug('====== ioloop before stop')
        tornado.ioloop.IOLoop.instance().stop()
        log.debug('====== ioloop after stop')

    def on_stop(self):
        if self.srv.is_active:
            self.srv.stop()




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
