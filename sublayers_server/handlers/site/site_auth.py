# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from handlers.base import BaseHandler

import tornado.web
from tornado.web import RequestHandler
from tornado.auth import GoogleOAuth2Mixin, OAuth2Mixin
from tornado.httputil import url_concat
import json
import hashlib
import urllib
from tornado.httpclient import HTTPClient
from random import randint
from bson.objectid import ObjectId


class SiteLoginHandler(BaseHandler):
    def get(self):
        if self.application.auth_db is None:
            # todo: сделать через механизм одноразовых пользователей
            self.set_secure_cookie("user", str(hashlib.md5(str(randint(0, 1000000))).hexdigest()))
            self.redirect("/")
            return
        msg = self.get_argument("msg", "")
        self.render("site/login.html", msg=msg)


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

    def _db_request(self, email, name=None, password=None):
        auth_db = self.application.auth_db
        db_res = None
        if name is not None:
            db_res = auth_db.profiles.find({'name': name})
            if db_res.count() > 0:
                return db_res[0]
        if password is None:
            db_res = auth_db.profiles.find({'auth.standard.email': email})
        else:
            db_res = auth_db.profiles.find({'auth': {'standard': {'email': email, 'password': password}}})
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
        username = self.get_argument('username', None)
        if (email is None) or (password is None) or (username is None):
            self.redirect("/login?msg=Ошибка%20авторизации")
            return
        username = username[0:20]                    
        user_id = self._db_request(email=email, name=username)
        if user_id is None:
            user_db_uid = str(self.application.auth_db.profiles.insert({
                'name': username,
                'auth': {
                    'standard': {
                        'email': email,
                        'password': hashlib.md5(password).hexdigest()
                    }
                }
            }))
            self.set_secure_cookie("user", user_db_uid)
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
            auth_db = self.application.auth_db
            db_res = auth_db.profiles.find({'auth': {'google': {'id': body_id}}}, {'id': 1})
            user_ids = []
            for db_rec in db_res:
                user_ids.append(db_rec)
            user_id = None
            if len(user_ids) == 1:
                user_id = user_ids[0]
            if (action == '1') and (user_id is None):
                user_db_uid = str(auth_db.profiles.insert({'name': body_id, 'auth': {'google': {'id': body_id}}}))
                return user_db_uid
            if (action == '2') and (user_id is not None):
                return str(user_id[u'_id'])
            return None


class OKLoginHandler(RequestHandler, OAuth2Mixin):
    _OAUTH_AUTHORIZE_URL = "http://www.odnoklassniki.ru/oauth/authorize"
    _OAUTH_ACCESS_TOKEN_URL = "https://api.odnoklassniki.ru/oauth/token.do"
    _OAUTH_SETTINGS_KEY = "ok_oauth"

    @tornado.gen.coroutine
    def get(self):
        if self.get_argument('action', False):
            self.set_cookie("action", self.get_argument("action"))
        if self.get_argument('code', False):
            http = HTTPClient()
            body = urllib.urlencode({
                "redirect_uri": "http://localhost/login/ok",
                "code": self.get_argument('code'),
                "client_id": self.settings[self._OAUTH_SETTINGS_KEY]['key'],
                "client_secret": self.settings[self._OAUTH_SETTINGS_KEY]['secret'],
                "grant_type": "authorization_code",
            })

            response = http.fetch(request=self._OAUTH_ACCESS_TOKEN_URL, method="POST",
                                  headers={'Content-Type': 'application/x-www-form-urlencoded'}, body=body)
            acc_token = json.loads(response.body)['access_token']

            hex_sign_1 = hashlib.md5(acc_token + self.settings[self._OAUTH_SETTINGS_KEY]['secret']).hexdigest()
            hex_sign = hashlib.md5('application_key=' + self.settings[self._OAUTH_SETTINGS_KEY]['public_key'] +
                                   'method=users.getCurrentUser' + hex_sign_1).hexdigest()

            args = {
                "method": "users.getCurrentUser",
                "access_token": acc_token,
                "application_key": self.settings[self._OAUTH_SETTINGS_KEY]['public_key'],
                "sig": hex_sign
            }

            path = url_concat('http://api.ok.ru/fb.do', args)
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
                redirect_uri='http://localhost/login/ok',
                client_id=self.settings[self._OAUTH_SETTINGS_KEY]['key'],
                scope=['VALUABLE_ACCESS'],
                response_type='code',
            )

    def _on_get_user_info(self, response):
        action = self.get_cookie("action")
        if (response.code == 200) and (response.error is None) and (action in ['1', '2']):
            body_id = json.loads(response.body)['uid']
            auth_db = self.application.auth_db
            db_res = auth_db.profiles.find({'auth': {'ok': {'id': body_id}}}, {'id': 1})
            user_ids = []
            for db_rec in db_res:
                user_ids.append(db_rec)
            user_id = None
            if len(user_ids) == 1:
                user_id = user_ids[0]
            if (action == '1') and (user_id is None):
                user_db_uid = str(auth_db.profiles.insert({'name': body_id, 'auth': {'ok': {'id': body_id}}}))
                return user_db_uid
            if (action == '2') and (user_id is not None):
                return str(user_id[u'_id'])
            return None


class VKLoginHandler(RequestHandler, OAuth2Mixin):
    _OAUTH_AUTHORIZE_URL = "https://oauth.vk.com/authorize"
    _OAUTH_ACCESS_TOKEN_URL = "https://oauth.vk.com/access_token"
    _OAUTH_SETTINGS_KEY = "vk_oauth"

    @tornado.gen.coroutine
    def get(self):
        if self.get_argument('action', False):
            self.set_cookie("action", self.get_argument("action"))
        if self.get_argument('code', False):
            http = HTTPClient()
            body = urllib.urlencode({
                "redirect_uri": "http://localhost/login/vk",
                "code": self.get_argument('code'),
                "client_id": self.settings[self._OAUTH_SETTINGS_KEY]['key'],
                "client_secret": self.settings[self._OAUTH_SETTINGS_KEY]['secret'],
                "grant_type": "authorization_code",
            })

            response = http.fetch(request=self._OAUTH_ACCESS_TOKEN_URL, method="POST",
                                  headers={'Content-Type': 'application/x-www-form-urlencoded'}, body=body)

            acc_token = json.loads(response.body)['access_token']

            args = {
                "access_token": acc_token,
            }

            path = url_concat('https://api.vk.com/method/users.get', args)
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
                redirect_uri='http://localhost/login/vk',
                client_id=self.settings[self._OAUTH_SETTINGS_KEY]['key'],
                scope=['email'],
                response_type='code',
            )


    def _on_get_user_info(self, response):
        action = self.get_cookie("action")
        if (response.code == 200) and (response.error is None) and (action in ['1', '2']):
            body_id = json.loads(response.body)['response'][0]['uid']
            auth_db = self.application.auth_db
            db_res = auth_db.profiles.find({'auth': {'vk': {'id': body_id}}}, {'id': 1})
            user_ids = []
            for db_rec in db_res:
                user_ids.append(db_rec)
            user_id = None
            if len(user_ids) == 1:
                user_id = user_ids[0]
            if (action == '1') and (user_id is None):
                user_db_uid = str(auth_db.profiles.insert({'name': body_id, 'auth': {'vk': {'id': body_id}}}))
                return user_db_uid
            if (action == '2') and (user_id is not None):
                return str(user_id[u'_id'])
            return None