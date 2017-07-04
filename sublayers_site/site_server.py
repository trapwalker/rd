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
    import log_setup
    log_setup.init()

log = logging.getLogger()

import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
from tornado.options import options

from sublayers_site import settings

import sublayers_site.handlers.site_auth
from sublayers_site.handlers.site_auth import StandardLoginHandler, LogoutHandler  #, RegisterOldUsersOnForum, SetForumUserAuth
from sublayers_site.handlers.site import SiteMainHandler, GetUserLocaleJSONHandler
from sublayers_site.handlers.user_info import GetUserInfoHandler, GetUserInfoByIDHandler
from sublayers_site.handlers.rpg_info import GetRPGInfoHandler, GetUserRPGInfoHandler
from sublayers_site.handlers.ratings_info import GetQuickGameRecords, GetRatingInfo
from sublayers_site.handlers.audio_test import GetAudioTest

from sublayers_common import service_tools
from sublayers_common.base_application import BaseApplication

import sublayers_server.model.registry_me.classes  #autoregistry classes
from sublayers_server.model.registry_me.tree import get_global_registry
from sublayers_site.news import NewsManager
from sublayers_site.site_locale import load_locale_objects


class Application(BaseApplication):
    def __init__(self, handlers=None, default_host="", transforms=None, **settings):
        settings.setdefault('static_path', options.static_path)
        settings.setdefault('login_url', '/login')

        super(Application, self).__init__(
            handlers=handlers, default_host=default_host, transforms=transforms, **settings)

        self.reg = get_global_registry(options.world_path, reload=options.reg_reload)
        self.news_manager = NewsManager()
        load_locale_objects()  # Загрузка всех локализаций

        self.add_handlers(".*$", [  # todo: use tornado.web.URLSpec
            (r"/login", StandardLoginHandler),
            (r"/logout", LogoutHandler),
            (r"/", SiteMainHandler),
            (r"/site_api/locale", GetUserLocaleJSONHandler),
            (r"/site_api/join_news_group", tornado.web.RedirectHandler, {"url": options.join_news_group_link}),
            (r"/site_api/get_user_info", GetUserInfoHandler),
            (r"/site_api/get_rpg_info", GetRPGInfoHandler),
            (r"/site_api/get_user_rpg_info", GetUserRPGInfoHandler),
            (r"/site_api/get_quick_game_records", GetQuickGameRecords),
            (r"/site_api/get_rating_info", GetRatingInfo),
            (r"/site_api/get_user_info_by_id", GetUserInfoByIDHandler),
            (r"/site_api/audio1", GetAudioTest),
            #(r"/site_api/forum_reg", RegisterOldUsersOnForum),
            #(r"/site_api/forum_auth", SetForumUserAuth),
        ])

        tornado.ioloop.IOLoop.instance().add_callback(self.on_init_site_structure)

    def on_init_site_structure(self):
        log.info('Site server READY')


def main():
    settings.load('site_server.conf')
    service_tools.pidfile_save(options.pidfile)
    app = Application()
    try:
        app.listen(options.port)
    except Exception as e:
        log.exception(e)
    else:
        log.debug('====== ioloop before start')
        try:
            tornado.ioloop.IOLoop.instance().start()
        except Exception as e:
            log.exception(e)
        log.debug('====== ioloop after start')
    finally:
        log.debug('====== finally before stop')
        app.stop()
        log.debug('====== finally after stop')


if __name__ == "__main__":
    main()
