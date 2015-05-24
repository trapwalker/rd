# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web
from handlers.base import BaseHandler
from tornado.web import RequestHandler
from tornado.auth import GoogleOAuth2Mixin, OAuth2Mixin
from tornado.httputil import url_concat
import json
import hashlib
import urllib
from tornado.httpclient import HTTPClient
from random import randint
from bson.objectid import ObjectId


def on_register_new_user(xmpp_manager, profiles, user_db_uid):
    jid = user_db_uid + xmpp_manager.host_name
    psw = str(hashlib.md5(jid + str(randint(0, 100))).hexdigest())
    if xmpp_manager.register_new_jid(jid=jid, password=psw):
        log.info('New XMPP user <<{}>> is registered'.format(jid))
    else:
        log.warning('New XMPP user <<{}>> is NOT registered'.format(jid))

    is_upd = profiles.update({"_id": ObjectId(user_db_uid)}, {'xmpp': {'jid': jid, 'password': psw}})
    if is_upd:
        return True
    else:
        return False


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
            user_db_uid = str(self.application.db.profiles.insert({
                'name': user,
                'auth': {
                    'standard': {
                        'email': email,
                        'password': hashlib.md5(password).hexdigest()
                    }
                }
            }))
            on_register_new_user(xmpp_manager=self.application.xmpp_manager, profiles=self.application.db.profiles,
                                 user_db_uid=user_db_uid)
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
            db = self.application.db
            db_res = db.profiles.find({'auth': {'google': {'id': body_id}}}, {'id': 1})
            user_ids = []
            for db_rec in db_res:
                user_ids.append(db_rec)
            user_id = None
            if len(user_ids) == 1:
                user_id = user_ids[0]
            if (action == '1') and (user_id is None):
                user_db_uid = str(db.profiles.insert({'name': body_id, 'auth': {'google': {'id': body_id}}}))
                on_register_new_user(xmpp_manager=self.application.xmpp_manager, profiles=db.profiles,
                                     user_db_uid=user_db_uid)
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
            db = self.application.db
            db_res = db.profiles.find({'auth': {'ok': {'id': body_id}}}, {'id': 1})
            user_ids = []
            for db_rec in db_res:
                user_ids.append(db_rec)
            user_id = None
            if len(user_ids) == 1:
                user_id = user_ids[0]
            if (action == '1') and (user_id is None):
                user_db_uid = str(db.profiles.insert({'name': body_id, 'auth': {'ok': {'id': body_id}}}))
                on_register_new_user(xmpp_manager=self.application.xmpp_manager, profiles=db.profiles,
                                     user_db_uid=user_db_uid)
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
            db = self.application.db
            db_res = db.profiles.find({'auth': {'vk': {'id': body_id}}}, {'id': 1})
            user_ids = []
            for db_rec in db_res:
                user_ids.append(db_rec)
            user_id = None
            if len(user_ids) == 1:
                user_id = user_ids[0]
            if (action == '1') and (user_id is None):
                user_db_uid = str(db.profiles.insert({'name': body_id, 'auth': {'vk': {'id': body_id}}}))
                on_register_new_user(xmpp_manager=self.application.xmpp_manager, profiles=db.profiles,
                                     user_db_uid=user_db_uid)
                return user_db_uid
            if (action == '2') and (user_id is not None):
                return str(user_id[u'_id'])
            return None