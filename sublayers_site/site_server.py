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
from sublayers_site.handlers.rpg_info import GetRPGInfoHandler, GetUserRPGInfoHandler
from sublayers_site.handlers.ratings_info import GetQuickGameRecords, GetRatingInfo
from sublayers_site.handlers.audio_test import GetAudioTest

from sublayers_common import service_tools
from sublayers_common.base_application import BaseApplication

import sublayers_server.model.registry.classes  #autoregistry classes
from sublayers_server.model.registry.storage import Registry, Collection


class Application(BaseApplication):
    def __init__(self, handlers=None, default_host="", transforms=None, **settings):
        settings.setdefault('xsrf_cookies', False)  # todo: (!) Починить и убрать эту строчку! По умолчанию True
        settings.setdefault('static_path', options.static_path)
        settings.setdefault('login_url', '/login')

        super(Application, self).__init__(
            handlers=handlers, default_host=default_host, transforms=transforms, **settings)

        self.reg = None
        self.reg_agents = None
        self.quick_game_cars_examples = []

        self.add_handlers(".*$", [  # todo: use tornado.web.URLSpec
            (r"/login", StandardLoginHandler),
            (r"/logout", LogoutHandler),
            (r"/", SiteMainHandler),
            (r"/site_api/get_user_info", GetUserInfoHandler),
            (r"/site_api/get_rpg_info", GetRPGInfoHandler),
            (r"/site_api/get_user_rpg_info", GetUserRPGInfoHandler),
            (r"/site_api/get_quick_game_records", GetQuickGameRecords),
            (r"/site_api/get_rating_info", GetRatingInfo),
            (r"/site_api/get_user_info_by_id", GetUserInfoByIDHandler),
            (r"/site_api/audio1", GetAudioTest),
        ])

        tornado.ioloop.IOLoop.instance().add_callback(self.on_init_site_structure)

    def on_init_site_structure(self):
        self.reg = Registry(name='registry', path=os.path.join(options.world_path, u'registry'))
        self.reg_agents = Collection(name='agents', db=self.db)

        # Создание экземпляров машинок для быстрой игры
        quick_game_cars_proto = []
        for car_proto in self.reg['/world_settings'].values.get('quick_game_car'):
            # todo: Здесь не должны инстанцироваться машинки
            car_example = self.reg[car_proto].instantiate()
            self.quick_game_cars_examples.append(car_example)

        print 'Road Dogs Site load !'


def main():
    settings.load('site_server.conf')
    service_tools.pidfile_save(options.pidfile)
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
