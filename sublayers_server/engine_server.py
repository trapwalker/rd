#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import

import sys
import os


def parent_folder(fn):
    return os.path.abspath(os.path.join(os.path.dirname(fn), '..'))


sys.path.append(parent_folder(__file__))

import logging

if __name__ == '__main__':
    from sublayers_server import log_setup
    log_setup.init('basic')

log = logging.getLogger()

import tornado.escape
import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.options
from tornado.options import options
import socket
import pymongo.errors

from sublayers_server import settings
from sublayers_server import uimodules

from sublayers_common import service_tools
from sublayers_common.base_application import BaseApplication

from sublayers_server.handlers.static import StaticFileHandlerPub
from sublayers_server.handlers.client_connector import AgentSocketHandler
from sublayers_server.handlers.pages import PlayHandler, MobilePlayHandler
from sublayers_server.handlers.mobile import MobileHeaderHandler, MobileContentHandler

from sublayers_server.handlers.main_car_info import MainCarInfoHandler, PersonInfoHandler, MenuCarHandler, PersonInfoCorpseHandler
from sublayers_server.handlers.main_menu_inventory import MainInventoryHandler, BarterInventoryHandler, \
    ContainerInventoryHandler
from sublayers_server.handlers.main_menu_nucoil import MainMenuNucoilHandler

from sublayers_server.handlers.main_menu_character import MenuCharacterHandler
from sublayers_server.handlers.main_menu_journal import MenuJournalHandler
from sublayers_server.handlers.party_handler import MenuPartyHandler
from sublayers_server.handlers.main_menu_settings import MenuSettingsHandler
from sublayers_server.handlers.main_menu_radio import MenuRadioHandler
from sublayers_server.handlers.teaching import MapTeachingHandler, ConsoleAnswerTeachingHandler, ResetTeachingHandler

from sublayers_server.handlers.site.site_auth import (
    SiteLoginHandler, LogoutHandler, StandardLoginHandler,
    # GoogleLoginHandler, OKLoginHandler, VKLoginHandler,
)
from sublayers_server.handlers.context_panel import ContextPanelListHandler

from sublayers_server.handlers.statistics import (
    ServerStatisticsHandler, ServerStatForSite, ServerStatMessagesHandler, ServerStatEventsHandler,
    ServerStatHandlersHandler, ServerStatGraphicsHandler, ServerStatEventGraphicsHandler, ServerStatQuestsHandler,
)
from sublayers_server.handlers.test_interlacing import TestInterlacingHandler
from sublayers_server.model.event_machine import BasicLocalServer, QuickLocalServer

from sublayers_server.handlers.site_api import (
    APIGetCarInfoHandler, APIGetUserInfoHandler, APIGetUserInfoHandler2, APIGetQuickGameCarsHandler,
)
from sublayers_server.handlers.modal_window_handler import APIGetQuickGameCarsView
from sublayers_common.site_locale import load_locale_objects
from sublayers_common.handlers.locale import GetUserLocaleJSONHandler

from ctx_timer import Timer


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
        # todo: Убрать ключи из кода

        super(Application, self).__init__(
            handlers=handlers, default_host=default_host, transforms=transforms, **settings)
        load_locale_objects(path='../sublayers_common/static/locale/game')
        self.init_handlers()
        self.clients = []
        self.chat = []  # todo: truncate chat history

        _server_class = dict(quick=QuickLocalServer, basic=BasicLocalServer)[options.mode]
        self.srv = _server_class(app=self)
        with Timer(logger=None) as t:
            self.srv.load_world()
            log.info('World loading DONE ({:.3f}s).'.format(t.duration))

    def init_handlers(self):
        from sublayers_server.handlers.adm_api import handlers as adm_api_handlers

        self.add_handlers(".*$", [  # todo: use tornado.web.URLSpec
            (r"/", tornado.web.RedirectHandler, dict(url="/play", permanent=False)),  # Редирект при запуске без сайта
            (r"/edit", tornado.web.RedirectHandler, dict(url="/static/editor.html", permanent=False)),
            (r"/ws", AgentSocketHandler),
            #(r"/static/(.*)", StaticFileHandlerPub),
            (r"/play", PlayHandler),
            # (r"/play/mobile", MobilePlayHandler),
            # (r"/play/mobile/header", MobileHeaderHandler),
            # (r"/play/mobile/content", MobileContentHandler),
            (r"/login", SiteLoginHandler),
            (r"/logout", LogoutHandler),
            (r"/login/standard", StandardLoginHandler),
            # (r"/login/google", GoogleLoginHandler),  # todo: social auth
            # (r"/login/ok", OKLoginHandler),
            # (r"/login/vk", VKLoginHandler),

            (r"/stat", ServerStatisticsHandler),
            (r"/site_stat", ServerStatForSite),
            (r"/stat/messages", ServerStatMessagesHandler),
            (r"/stat/events", ServerStatEventsHandler),
            (r"/stat/handlers", ServerStatHandlersHandler),
            (r"/stat/graphics", ServerStatGraphicsHandler),
            (r"/stat/event_graphics", ServerStatEventGraphicsHandler),
            (r"/stat/quests", ServerStatQuestsHandler),

            (r"/api/locale", GetUserLocaleJSONHandler),  # todo: rename

            (r"/api/main_menu_nucoil", MainMenuNucoilHandler),
            (r"/api/inventory", MainInventoryHandler),
            (r"/api/container", ContainerInventoryHandler),
            (r"/api/barter", BarterInventoryHandler),
            (r"/api/person_info", PersonInfoHandler),
            (r"/api/corpse_info", PersonInfoCorpseHandler),

            (r"/api/menu_character", MenuCharacterHandler),
            (r"/api/menu_car", MenuCarHandler),
            (r"/api/menu_journal", MenuJournalHandler),
            (r"/api/menu_party", MenuPartyHandler),
            (r"/api/menu_settings", MenuSettingsHandler),
            (r"/api/menu_radio", MenuRadioHandler),
            (r"/api/map_teaching", MapTeachingHandler),
            (r"/api/tca", ConsoleAnswerTeachingHandler),
            (r"/api/teaching_reset", ResetTeachingHandler),

            (r"/api/context_panel/locations", ContextPanelListHandler),
            (r"/api/context_panel/barter_send", ContextPanelListHandler),
            (r"/api/context_panel/barter_info", ContextPanelListHandler),

            (r"/api/quick_game_cars", APIGetQuickGameCarsView),

            # Site API
            (r"/api/get_car_info", APIGetCarInfoHandler),
            (r"/api/get_user_info", APIGetUserInfoHandler),
            (r"/api/get_user_info2", APIGetUserInfoHandler2),
            (r"/api/get_quick_game_cars", APIGetQuickGameCarsHandler),

            (r"/interlacing", TestInterlacingHandler),
        ] + adm_api_handlers)

    def start(self):
        self.srv.start()
        try:
            self.listen(options.port)
        except socket.error as e:
            if os.name == 'nt':
                _message = str(e).decode('cp1251', errors='ignore')
            else:
                _message = e

            _message = u'{} port: {}'.format(_message, options.port)
            try:
                log.critical(_message)
            except:
                log.critical(repr(_message))

            print _message
        except Exception as e:
            log.exception(e)
            log.debug('==== finally before stop')
            self.stop()
            log.debug('==== finally after stop')
        else:
            log.debug('==== IOLoop START ' + '=' * 32)
            try:
                tornado.ioloop.IOLoop.instance().start()
            except Exception as e:
                log.exception(e)
            log.debug('==== IOLoop FINISHED ' + '=' * 29)
        #finally:

    def stop(self):
        self.srv.flash_save()
        if self.srv.is_active:
            self.srv.stop()

        super(Application, self).stop()

    def __getstate__(self):
        pass


def main():
    try:
        log.info('\n\n\n' + '=' * 67)
        settings.load(os.path.join(os.path.dirname(__file__), 'server.conf'))
        service_tools.pidfile_save(options.pidfile)
        app = Application()
        # service_tools.set_terminate_handler(app.stop)
        app.start()
    except pymongo.errors.ConnectionFailure as e:
        try:
            msg = str(e).decode('cp1251') if os.name == 'nt' else repr(e)
        except:
            msg = repr(e)

        log.critical(u'Databse error: %s', msg)
        sys.exit(1)
    except Exception as e:
        log.exception(e)


if __name__ == "__main__":
    main()
