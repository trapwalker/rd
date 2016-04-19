# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from user_profile import User
from tornado.httpclient import AsyncHTTPClient
import json
import tornado
import tornado.web
from tornado.options import options


class AuthHandlerMixin(tornado.web.RequestHandler):
    @property
    def db(self):
        return self.application.db

    def get_current_user(self):
        '''Use `current_user` property in handlers'''
        user_id = self.get_secure_cookie("user")
        if not user_id:
            return

        user = User.get_by_id(self.db, user_id)
        return user


class BaseHandler(AuthHandlerMixin):
    def get_template_namespace(self):
        namespace = super(BaseHandler, self).get_template_namespace()
        return namespace

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