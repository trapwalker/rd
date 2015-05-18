# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web
from handlers.base import BaseHandler


class SiteLoginHandler(BaseHandler):
    def get(self):
        self.render("site\login.html")

    def _registration(self):
        email = self.get_argument('email', None)
        password = self.get_argument('password', None)
        user = self.get_argument('username', None)
        if (email is None) or (password is None) or (user is None):
            self.redirect("/login")
            return
        self.set_secure_cookie("user", user)
        self.redirect("/")

    def _autorisation(self):
        email = self.get_argument('email', None)
        password = self.get_argument('password', None)
        if (email is None) or (password is None):
            self.redirect("/login")
            return
        self.redirect("/login")

    def post(self):
        print 1111
        action = self.get_argument('action', None)
        if action == '1':
            self._registration()
        elif action == '2':
            self._autorisation()
        else:
            self.redirect("/login")


class SiteLogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("user")
        self.redirect("/")