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

import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
from tornado.options import options

import settings

import sublayers_site.handlers.site_auth
from sublayers_site.handlers.site_auth import StandardLoginHandler, LogoutHandler
from sublayers_site.handlers.site import SiteMainHandler
from sublayers_site.handlers.user_info import GetUserInfoHandler, GetUserInfoByIDHandler
from sublayers_site.handlers.ratings_info import GetQuickGameRecords, GetRatingInfo
from sublayers_site.handlers.audio_test import GetAudioTest

from sublayers_common.base_application import BaseApplication

import sublayers_server.model.registry.classes  #autoregistry classes
from sublayers_server.model.registry.storage import Registry


class Application(BaseApplication):
    def __init__(self, handlers=None, default_host="", transforms=None, **settings):
        settings.setdefault('xsrf_cookies', False)  # todo: (!) Починить и убрать эту строчку! По умолчанию True
        settings.setdefault('static_path', options.static_path)
        settings.setdefault('static_url_prefix', '/static_site/')
        settings.setdefault('login_url', '/login')

        self.reg = Registry(name='registry', path=os.path.join(options.world_path, u'registry'))

        super(Application, self).__init__(
            handlers=handlers, default_host=default_host, transforms=transforms, **settings)

        self.add_handlers(".*$", [  # todo: use tornado.web.URLSpec
            (r"/login", StandardLoginHandler),
            (r"/logout", LogoutHandler),
            (r"/", SiteMainHandler),
            (r"/get_user_info", GetUserInfoHandler),
            (r"/site_api/get_quick_game_records", GetQuickGameRecords),
            (r"/site_api/get_rating_info", GetRatingInfo),
            (r"/site_api/get_user_info_by_id", GetUserInfoByIDHandler),
            (r"/site_api/audio1", GetAudioTest),
        ])

        print 'Road Dogs Site load !'


def main():
    settings.load('site_server.conf')
    app = Application()
    try:
        app.listen(options.port)
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
