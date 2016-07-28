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

from sublayers_server import settings
from sublayers_server import uimodules

from sublayers_common import service_tools
from sublayers_common.base_application import BaseApplication

from sublayers_server.handlers.static import StaticFileHandlerPub
from sublayers_server.handlers.client_connector import AgentSocketHandler
from sublayers_server.handlers.pages import PlayHandler

from sublayers_server.handlers.main_car_info import MainCarInfoHandler, PersonInfoHandler, MenuCarHandler
from sublayers_server.handlers.main_menu_inventory import MainInventoryHandler, BarterInventoryHandler, \
    ContainerInventoryHandler
from sublayers_server.handlers.main_menu_nucoil import MainMenuNucoilHandler


from sublayers_server.handlers.main_menu_character import MenuCharacterHandler
from sublayers_server.handlers.main_menu_journal import MenuJournalHandler
from sublayers_server.handlers.party_handler import MenuPartyHandler

from sublayers_server.handlers.site.site_auth import (
    SiteLoginHandler, LogoutHandler, StandardLoginHandler,
    # GoogleLoginHandler, OKLoginHandler, VKLoginHandler,
)
from sublayers_server.handlers.context_panel import ContextPanelListHandler

from sublayers_server.handlers.statistics import (
    ServerStatisticsHandler, ServerStatisticsRefreshHandler, ServerStatForSite,
)
from sublayers_server.handlers.test_interlacing import TestInterlacingHandler
from sublayers_server.model.event_machine import LocalServer

from sublayers_server.handlers.site_api import (
    APIGetCarInfoHandler, APIGetUserInfoHandler, APIGetUserInfoHandler2, APIGetQuickGameCarsHandler,
)


class Application(BaseApplication):
    def __init__(self, handlers=None, default_host="", transforms=None, **settings):
        settings.setdefault('static_path', options.static_path)
        settings.setdefault('ui_modules', uimodules)
        settings.setdefault('login_url', "/login")
        settings.setdefault('google_oauth', {
            "key": "106870863695-ofsuq4cf087mj5n83s5h8mfknnudkm4k.apps.googleusercontent.com",
            "secret": "JOXGxpPxKGqr_9TYW9oYT8g_",
        })
        settings.setdefault('ok_oauth', {
            "key": "1137609984",
            "secret": "BB413D7F8E6B685D19AE3FE0",
            "public_key": "CBAOIPMEEBABABABA",
        })
        settings.setdefault('vk_oauth', {
            "key": "4926489",
            "secret": "4gyveXhKv5aVNCor5bkB",
        })

        super(Application, self).__init__(
            handlers=handlers, default_host=default_host, transforms=transforms, **settings)

        self.srv = LocalServer(app=self)
        log.debug('server instance init')
        self.srv.start()
        log.info('ENGINE LOOP STARTED' + '-' * 50)
        self.clients = []
        self.chat = []
        # todo: truncate chat history
        self.srv.load_registry()

        self.add_handlers(".*$", [  # todo: use tornado.web.URLSpec
            (r"/", tornado.web.RedirectHandler, dict(url="/play", permanent=False)),  # Редирект при запуске без сайта
            (r"/edit", tornado.web.RedirectHandler, dict(url="/static/editor.html", permanent=False)),
            (r"/ws", AgentSocketHandler),
            #(r"/static/(.*)", StaticFileHandlerPub),
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

            (r"/api/main_menu_nucoil", MainMenuNucoilHandler),
            (r"/api/inventory", MainInventoryHandler),
            (r"/api/container", ContainerInventoryHandler),
            (r"/api/barter", BarterInventoryHandler),
            (r"/api/person_info", PersonInfoHandler),

            (r"/api/menu_character", MenuCharacterHandler),
            (r"/api/menu_car", MenuCarHandler),
            (r"/api/menu_journal", MenuJournalHandler),
            (r"/api/menu_party", MenuPartyHandler),


            (r"/api/context_panel/locations", ContextPanelListHandler),
            (r"/api/context_panel/barter_send", ContextPanelListHandler),
            (r"/api/context_panel/barter_info", ContextPanelListHandler),

            # Site API
            (r"/api/get_car_info", APIGetCarInfoHandler),
            (r"/api/get_user_info", APIGetUserInfoHandler),
            (r"/api/get_user_info2", APIGetUserInfoHandler2),
            (r"/api/get_quick_game_cars", APIGetQuickGameCarsHandler),

            (r"/interlacing", TestInterlacingHandler),
        ])

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
