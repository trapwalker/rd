# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from user_profile import User
from bson.objectid import ObjectId, InvalidId
from tornado.httpclient import AsyncHTTPClient
import json
import tornado
import tornado.web
from tornado.options import options


class AuthHandlerMixin(tornado.web.RequestHandler):
    @tornado.gen.coroutine
    def prepare(self):
        user = None
        user_id = self.get_secure_cookie("user")
        if user_id:
            try:
                user = yield User.objects.get(ObjectId(user_id))
            except InvalidId as e:
                log.warning('User resolve error: %r', e)

        self.current_user = user


class BaseHandler(AuthHandlerMixin):
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