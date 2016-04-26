# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

import tornado.web
import tornado.gen
from tornado.options import options
from tornado.httpclient import AsyncHTTPClient
from bson.objectid import ObjectId, InvalidId
import json


class BaseSiteHandler(BaseHandler):
    @tornado.gen.coroutine
    def _get_car(self, username):
        http = AsyncHTTPClient()
        try:
            response = yield http.fetch(request=options.get_user_info + '?username=' + username, method="GET",
                                        headers={'Content-Type': 'application/x-www-form-urlencoded'})
        except:
            raise tornado.gen.Return(dict())
        if response.body:
            raise tornado.gen.Return(json.loads(response.body))
        else:
            raise tornado.gen.Return(dict())

    @tornado.gen.coroutine
    def _get_quick_game(self):
        http = AsyncHTTPClient()
        try:
            response = yield http.fetch(request=options.get_quick_game, method="GET",
                                        headers={'Content-Type': 'application/x-www-form-urlencoded'})
        except:
            raise tornado.gen.Return(dict())
        if response.body:
            raise tornado.gen.Return(json.loads(response.body))
        else:
            raise tornado.gen.Return(dict())
