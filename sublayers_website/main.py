# -*- coding: UTF-8 -*-
import logging
log = logging.getLogger(__name__)

import tornado.web


class BaseHandler(tornado.web.RequestHandler):
    def get_current_user(self):
        return self.get_secure_cookie("user")


class MainHandler(BaseHandler):
    def get(self):
        self.render("index.html")


class PlayHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        self.render("play.html")
        