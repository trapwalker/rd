# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web
from handlers.base import BaseHandler
from tornado.web import RequestHandler
from tornado.auth import GoogleOAuth2Mixin
import json
import hashlib
from tornado.httpclient import HTTPClient


class SiteLoginHandler(BaseHandler):
    def get(self):
        msg = self.get_argument('msg', '')
        self.render("site\login.html", msg=msg)


class SiteLogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("user")
        self.redirect("/")


class StandardLoginHandler(BaseHandler):
    def post(self):
        action = self.get_argument('action', None)
        if action == '1':
            self._registration()
        elif action == '2':
            self._authorisation()
        else:
            self.redirect("/login?msg=Ошибка%20авторизации")

    def _db_request(self, email, password=None):
        db = self.application.db
        if password is None:
            db_res = db.profiles.find({'auth': {'standard': {'email': email}}}, {'id': 1})
        else:
            db_res = db.profiles.find({'auth': {'standard': {'email': email, 'password': password}}}, {'id': 1})
        user_ids = []
        for db_rec in db_res:
            user_ids.append(db_rec)
        user_id = None
        if len(user_ids) == 1:
            user_id = user_ids[0]
        return user_id

    def _registration(self):
        email = self.get_argument('email', None)
        password = self.get_argument('password', None)
        user = self.get_argument('username', None)
        if (email is None) or (password is None) or (user is None):
            self.redirect("/login?msg=Ошибка%20авторизации")
            return
        user_id = self._db_request(email=email)
        if user_id is None:
            self.set_secure_cookie("user",
                                   str(self.application.db.profiles.insert({
                                       'name': user,
                                       'auth': {
                                           'standard': {
                                               'email': email,
                                               'password': hashlib.md5(password).hexdigest()
                                           }
                                       }
                                   })))
            self.redirect("/")
        else:
            self.redirect("/login?msg=Ошибка%20авторизации")

    def _authorisation(self):
        email = self.get_argument('email', None)
        password = self.get_argument('password', None)
        if (email is None) or (password is None):
            self.redirect("/login?msg=Ошибка%20авторизации")
            return
        user_id = self._db_request(email=email, password=hashlib.md5(password).hexdigest())
        if user_id is not None:
            self.set_secure_cookie("user", str(user_id[u'_id']))
            self.redirect("/")
        else:
            self.redirect("/login?msg=Ошибка%20авторизации")


class GoogleLoginHandler(RequestHandler, GoogleOAuth2Mixin):
    @tornado.gen.coroutine
    def get(self):
        if self.get_argument('action', False):
            self.set_cookie("action", self.get_argument("action"))
        if self.get_argument('code', False):
            user = yield self.get_authenticated_user(
                redirect_uri='http://localhost/login/google',
                code=self.get_argument('code'))
            http = HTTPClient()
            path = u"https://www.googleapis.com/plus/v1/people/me?access_token=" + user[u'access_token']
            response = http.fetch(request=path,
                       method="GET", headers={'Content-Type': 'application/x-www-form-urlencoded'})
            cookie = self._on_get_user_info(response)
            self.clear_cookie("action")
            if cookie is not None:
                self.set_secure_cookie("user", cookie)
                self.redirect("/")
            else:
                self.redirect("/login?msg=Ошибка%20авторизации")
        else:
            yield self.authorize_redirect(
                redirect_uri='http://localhost/login/google',
                client_id=self.settings['google_oauth']['key'],
                scope=['profile'],
                response_type='code',
                extra_params={'approval_prompt': 'auto'})

    def _on_get_user_info(self, response):
        action = self.get_cookie("action")
        if (response.code == 200) and (response.error is None) and (action in ['1', '2']):
            body_id = json.loads(response.body)[u'id']
            db = self.application.db
            db_res = db.profiles.find({'auth': {'google': {'id': body_id}}}, {'id': 1})
            user_ids = []
            for db_rec in db_res:
                user_ids.append(db_rec)
            user_id = None
            if len(user_ids) == 1:
                user_id = user_ids[0]
            if (action == '1') and (user_id is None):
                return str(db.profiles.insert({'name': body_id, 'auth': {'google': {'id': body_id}}}))
            if (action == '2') and (user_id is not None):
                return str(user_id[u'_id'])
            return None