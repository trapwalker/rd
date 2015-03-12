# -*- coding: UTF-8 -*-
import logging
log = logging.getLogger(__name__)

from tornado.web import RequestHandler, authenticated


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
