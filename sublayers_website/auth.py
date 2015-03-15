# -*- coding: UTF-8 -*-
import logging
log = logging.getLogger(__name__)

import tornado.web
import tornado.auth

from main import BaseHandler


class BaseAuthHandler(BaseHandler):
    pass


class AuthGoogleHandler(BaseAuthHandler, tornado.auth.GoogleMixin):
    @tornado.web.asynchronous
    def get(self):
        if self.get_argument("openid.mode", None):
            self.get_authenticated_user(self.async_callback(self._on_auth))
            return
        self.authenticate_redirect()

    def _on_auth(self, user):
        if not user:
            raise tornado.web.HTTPError(500, "Google auth failed")

        user_id = user["email"]
        self.set_secure_cookie("user", str(user_id))
        self.redirect(self.get_argument("next", "/"))


class AuthLoginHandler(BaseAuthHandler):

    def post(self):
        user_id = self.get_argument('login')
        self.set_secure_cookie("user", str(user_id))
        self.redirect(self.get_argument("next", "/"))


class AuthRegHandler(BaseAuthHandler):

    def post(self):
        user_id = self.get_argument('login')
        self.set_secure_cookie("user", str(user_id))
        self.redirect(self.get_argument("next", "/"))


class AuthLogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("user")
        self.redirect(self.get_argument("next", "/"))
