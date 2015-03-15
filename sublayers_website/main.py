# -*- coding: UTF-8 -*-
import logging
log = logging.getLogger(__name__)

from tornado.web import RequestHandler, authenticated, asynchronous, GoogleMixin


class BaseHandler(RequestHandler):
    def get_current_user(self):
        return self.get_secure_cookie("user")


class MainHandler(BaseHandler):
    def get(self):
        self.render("index.html")

    def post(self):
        
        pass


class PlayHandler(BaseHandler):
    @authenticated
    def get(self):
        self.render("play.html")


class AuthLoginHandler(BaseHandler, GoogleMixin):
    @asynchronous
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


class AuthLogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("user")
        self.redirect(self.get_argument("next", "/"))

        