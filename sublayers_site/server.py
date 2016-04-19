# -*- coding: utf-8 -*-
#!/usr/bin/env python
#
# Copyright 2009 Facebook
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.

import logging.config
logging.config.fileConfig("logging.conf")
log = logging.getLogger(__name__)

import os

import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
from tornado.options import define, options
import settings


from handlers.site_auth import StandardLoginHandler, LogoutHandler
from handlers.site import SiteMainHandler, SiteMainHandler1, SiteMainHandler2, SiteMainHandler3
from handlers.user_info import GetUserInfoHandler, GetUserInfoByIDHandler
from handlers.ratings_info import GetQuickGameRecords, GetRatingInfo


from pymongo import MongoClient

try:
    from pymongo import Connection
except ImportError:
    from pymongo import MongoClient as Connection


class DBError(Exception):
    pass


class Application(tornado.web.Application):
    def __init__(self):
        log.info('Road Dogs Site')

        self.db = MongoClient(options.db)[options.db_name]

        handlers = [
            (r"/login", StandardLoginHandler),
            (r"/logout", LogoutHandler),
            (r"/", SiteMainHandler),
            (r"/other1", SiteMainHandler1),
            (r"/other2", SiteMainHandler2),
            (r"/other3", SiteMainHandler3),
            (r"/get_user_info", GetUserInfoHandler),
            (r"/site_api/get_quick_game_records", GetQuickGameRecords),
            (r"/site_api/get_rating_info", GetRatingInfo),
            (r"/site_api/get_user_info_by_id", GetUserInfoByIDHandler),
        ]

        settings = dict(
            cookie_secret=options.cookie_secret,
            template_path=options.template_path,
            static_path=options.static_path,
            static_url_prefix='/static_site/',
            # xsrf_cookies=True,
            # ui_modules=uimodules,
            login_url="/login",
            # debug=True,
            # autoreload=False,
            # google_oauth={"key": "106870863695-ofsuq4cf087mj5n83s5h8mfknnudkm4k.apps.googleusercontent.com",
            #               "secret": "JOXGxpPxKGqr_9TYW9oYT8g_"},
            # ok_oauth={"key": "1137609984",
            #           "secret": "BB413D7F8E6B685D19AE3FE0",
            #           "public_key": "CBAOIPMEEBABABABA"},
            # vk_oauth={"key": "4926489",
            #           "secret": "4gyveXhKv5aVNCor5bkB"},

        )

        tornado.web.Application.__init__(self, handlers, **settings)
        print '!!! Road Dogs Site was started !!!'


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