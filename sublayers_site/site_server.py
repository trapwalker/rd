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
from sublayers_site.handlers.site_auth import (StandardLoginHandler, LogoutHandler, GoogleLoginHandler, VKLoginHandler,
                                               TwitterLoginHandler, FacebookLoginHandler, SteamLoginHandler, SteamOpenIDHandler)
from sublayers_site.handlers.site import SiteMainHandler, SitePingHandler, SiteCheckAuthId
from sublayers_site.handlers.user_info import GetUserInfoHandler, GetUserInfoByIDHandler
from sublayers_site.handlers.rpg_info import GetRPGInfoHandler, GetUserRPGInfoHandler
from sublayers_site.handlers.ratings_info import GetQuickGameRecords, GetRatingInfo
from sublayers_site.handlers.audio_test import GetAudioTest
from sublayers_site.handlers.email_confirm import EmailConfirmHandler

from sublayers_common import mailing
from sublayers_common import service_tools
from sublayers_common.base_application import BaseApplication
from sublayers_common.site_locale import load_locale_objects
from sublayers_common.handlers.locale import GetUserLocaleJSONHandler

import sublayers_server.model.registry_me.classes  #autoregistry classes
from sublayers_server.model.registry_me.tree import get_global_registry
from sublayers_site.news import NewsManager


class Application(BaseApplication):
    def __init__(self, handlers=None, default_host="", transforms=None, **settings):
        settings.setdefault('static_path', options.static_path)
        settings.setdefault('login_url', '/login')

        # Добавление полей для OAuth
        if options.auth_google_key and options.auth_google_secret:
            settings["google_oauth"] = {"key": options.auth_google_key, "secret": options.auth_google_secret}
        else:
            log.warning('[Social Auth] Google OAuth params not found in options. Google Auth not work.')

        if options.auth_vk_key and options.auth_vk_secret:
            settings["vk_oauth"] = {"key": options.auth_vk_key, "secret": options.auth_vk_secret}
        else:
            log.warning('[Social Auth] VK OAuth params not found in options. VK Auth not work.')

        if options.auth_twitter_key and options.auth_twitter_secret:
            settings["twitter_consumer_key"] = options.auth_twitter_key
            settings["twitter_consumer_secret"] = options.auth_twitter_secret
        else:
            log.warning('[Social Auth] Twitter OAuth params not found in options. Twitter Auth not work.')

        if options.auth_facebook_key and options.auth_facebook_secret:
            settings["facebook_api_key"] = options.auth_facebook_key
            settings["facebook_secret"] = options.auth_facebook_secret
        else:
            log.warning('[Social Auth] Facebook OAuth params not found in options. Facebook Auth not work.')

        if options.auth_steam_key and options.auth_steam_appid:
            settings["steam_auth"] = {"key": options.auth_steam_key, "appid": options.auth_steam_appid, "wep_api": options.web_api_steam_key}
        else:
            log.warning('[Social Auth] Steam Auth params not found in options. Steam Auth not work.')


        super(Application, self).__init__(
            handlers=handlers, default_host=default_host, transforms=transforms, **settings)

        self.email_sender = mailing.Sender(
            host=options.email_server,
            login=options.email_login or options.email_from,
            password=options.email_password,
        ) if options.email_server else None

        if self.email_sender is None:
            log.warning('Mailing subsystem DISABLEED because service is not configured')

        self.reg = get_global_registry(options.world_path, reload=options.reg_reload)
        self.news_manager = NewsManager()
        load_locale_objects('../sublayers_common/static/locale/site', options.world_path)  # Загрузка всех локализаций

        self.add_handlers(".*$", [  # todo: use tornado.web.URLSpec
            (r"/email_confirm", EmailConfirmHandler),
            (r"/login", StandardLoginHandler),
            (r"/logout", LogoutHandler),
            (r"/", SiteMainHandler),
            (r"/site_api/locale", GetUserLocaleJSONHandler),
            (r"/site_api/ping", SitePingHandler),
            (r"/site_api/user_check", SiteCheckAuthId),
            (r"/site_api/join_news_group", tornado.web.RedirectHandler, {"url": options.join_news_group_link}),
            (r"/site_api/get_user_info", GetUserInfoHandler),
            (r"/site_api/get_rpg_info", GetRPGInfoHandler),
            (r"/site_api/get_user_rpg_info", GetUserRPGInfoHandler),
            (r"/site_api/get_quick_game_records", GetQuickGameRecords),
            (r"/site_api/get_rating_info", GetRatingInfo),
            (r"/site_api/get_user_info_by_id", GetUserInfoByIDHandler),
            (r"/site_api/audio1", GetAudioTest),

            (r"/site_api/auth/google", GoogleLoginHandler),
            (r"/site_api/auth/vk", VKLoginHandler),
            (r"/site_api/auth/twitter", TwitterLoginHandler),
            (r"/site_api/auth/facebook", FacebookLoginHandler),
            (r"/site_api/auth/steam", SteamLoginHandler),
            (r"/site_api/auth/steam_openid", SteamOpenIDHandler)
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
