#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import

import sys
import os


def parent_folder(fn):
    return os.path.abspath(os.path.join(os.path.dirname(fn), '..'))


sys.path.append(parent_folder(__file__))

import logging
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
from urlparse import urlparse
from pymongo import MongoClient
from motorengine import connect as db_connect

from sublayers_server import settings
from sublayers_server import service_tools

from sublayers_server import uimodules
from sublayers_server.handlers.static import StaticFileHandlerPub
from sublayers_server.handlers.client_connector import AgentSocketHandler
from sublayers_server.handlers.pages import PlayHandler
from sublayers_server.handlers.main_menu_character import MainMenuCharacterHandler
from sublayers_server.handlers.main_car_info import MainCarInfoHandler, PersonInfoHandler
from sublayers_server.handlers.main_menu_inventory import MainInventoryHandler, BarterInventoryHandler, \
    ContainerInventoryHandler
from sublayers_server.handlers.main_menu_nucoil import MainMenuNucoilHandler
from sublayers_server.handlers.main_menu_journal import MainJournalHandler
from sublayers_server.handlers.party_handler import PartyHandler
from sublayers_server.handlers.map_location import MapLocationHandler
from sublayers_server.handlers.site.site_handler import SiteHandler
from sublayers_server.handlers.site.site_auth import (
    SiteLoginHandler, LogoutHandler, StandardLoginHandler,
    # GoogleLoginHandler, OKLoginHandler, VKLoginHandler,
)
from sublayers_server.handlers.context_panel import (
    ContextPanelBarterInfoHandler, ContextPanelBarterSendHandler, ContextPanelLocationsHandler,
)
from sublayers_server.handlers.statistics import (
    ServerStatisticsHandler, ServerStatisticsRefreshHandler, ServerStatForSite,
)
from sublayers_server.handlers.test_interlacing import TestInterlacingHandler
from sublayers_server.model.event_machine import LocalServer

from sublayers_server.handlers.site_api import (
    APIGetCarInfoHandler, APIGetUserInfoHandler, APIGetUserInfoHandler2, APIGetQuickGameCarsHandler,
)


class DBError(Exception):
    pass


class Application(tornado.web.Application):
    def __init__(self):
        try:
            self.revision = service_tools.HGRevision()
        except Exception as e:
            self.revision = None
            log.warning("Can't get HG revision info: %s", e)

        dsn = urlparse(options.db)
        self.dba = db_connect(
            db=dsn.path.lstrip('/'),
            host=dsn.hostname,
            port=dsn.port,
            io_loop=tornado.ioloop.IOLoop.instance(),
        )
        self.db = MongoClient(options.db)[dsn.path.lstrip('/')]

        log.info('\n' + '=-' * 70)
        log.info('GAME ENGINE SERVICE STARTING %s\n' + '--' * 70, self.revision)
        self.srv = LocalServer(app=self)
        log.debug('server instance init')
        self.srv.start()
        log.info('ENGINE LOOP STARTED' + '-' * 50)
        self.clients = []
        self.chat = []
        # todo: tuncate chat history

        self.srv.load_world()

        handlers = [
            (r"/", SiteHandler),
            (r"/edit", tornado.web.RedirectHandler, {"url": "/static/editor.html", "permanent": False}),
            (r"/ws", AgentSocketHandler),
            (r"/static/(.*)", StaticFileHandlerPub),
            (r"/play", PlayHandler),

            (r"/login", SiteLoginHandler),
            (r"/logout", LogoutHandler),
            (r"/login/standard", StandardLoginHandler),
            # (r"/login/google", GoogleLoginHandler),  # todo: social auth
            # (r"/login/ok", OKLoginHandler),
            # (r"/login/vk", VKLoginHandler),

            (r"/stat", ServerStatisticsHandler),
            (r"/site_stat", ServerStatForSite),
            (r"/server_stat_refresh", ServerStatisticsRefreshHandler),
            (r"/api/location", MapLocationHandler),
            (r"/api/main_menu_character", MainMenuCharacterHandler),
            (r"/api/main_car_info", MainCarInfoHandler),
            (r"/api/main_menu_nucoil", MainMenuNucoilHandler),
            (r"/api/inventory", MainInventoryHandler),
            (r"/api/party", PartyHandler),
            (r"/api/container", ContainerInventoryHandler),
            (r"/api/barter", BarterInventoryHandler),
            (r"/api/person_info", PersonInfoHandler),
            (r"/api/map_journal", MainJournalHandler),

            (r"/api/context_panel/locations", ContextPanelLocationsHandler),
            (r"/api/context_panel/barter_send", ContextPanelBarterSendHandler),
            (r"/api/context_panel/barter_info", ContextPanelBarterInfoHandler),

            # Site API
            (r"/api/get_car_info", APIGetCarInfoHandler),
            (r"/api/get_user_info", APIGetUserInfoHandler),
            (r"/api/get_user_info2", APIGetUserInfoHandler2),
            (r"/api/get_quick_game_cars", APIGetQuickGameCarsHandler),

            (r"/interlacing", TestInterlacingHandler)
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

    def __getstate__(self):
        pass


def main():
    log.info('\n\n\n' + '==' * 70)
    settings.load('server.conf')
    service_tools.pidfile_save(options.pidfile)
    app = Application()
    # service_tools.set_terminate_handler(app.stop)
    try:
        log.info('port %s listening', options.port)
        app.listen(options.port)
    except socket.error as e:
        log.critical(e)
        print e
    except Exception as e:
        log.critical(e)
        print e
    else:
        log.debug('====== ioloop start')
        tornado.ioloop.IOLoop.instance().start()
        log.debug('====== ioloop finished')
    finally:
        log.debug('====== finally before stop')
        app.stop()
        log.debug('====== finally after stop')


if __name__ == "__main__":
    main()
