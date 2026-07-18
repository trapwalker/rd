# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler
from sublayers_common.user_profile import User

from tornado.web import HTTPError
import urllib.parse


class LogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("user")
        self.redirect("/")


class SiteLoginHandler(BaseHandler):
    def get(self):
        msg = self.get_argument("msg", "")
        self.render("site/login.html", msg=msg)


class BaseLoginHandler(BaseHandler):
    def login_error_redirect(self, doseq=0, **kw):
        url = urllib.parse.urlencode(
            [(k, str(v)) for k, v in kw.items()],
            doseq,
        )
        self.redirect("/login?{}".format(url))  # todo: use reverse resolver


class StandardLoginHandler(BaseLoginHandler):
    def post(self):
        action = self.get_argument('action', None)
        if action == 'reg':
            res = self._registration()
        elif action == 'auth':
            res = self._authorisation()
        else:
            raise HTTPError(405, log_message='Wrong action {}.'.format(action))

        return res

    def _registration(self):
        email = self.get_argument('email', None)
        password = self.get_argument('password', None)
        username = self.get_argument('username', None)
        if (
            not email
            or not password
            or len(email) > 100  # todo: Вынести лимиты в константы
            or username and len(username) > 100
            or email.count('@') != 1
        ):
            raise HTTPError(400, log_message='Wrong auth data.')

        user = User.get_by_email(email=email)
        if user:
            return self.login_error_redirect(msg="Пользователь с таким email уже зарегистрирован.")

        user = User.get_by_name(name=username)
        if user:
            return self.login_error_redirect(msg="Пользователь с таким именем уже зарегистрирован.")

        # todo: check username unical
        # Автономная регистрация на движке (без сайта) не проходит онбординг
        # сайта (nickname→settings→chip), поэтому пользователь сразу считается
        # зарегистрированным — иначе PlayHandler не пустит его в игру.
        user = User(name=username, raw_password=password, email=email, registration_status='register').save()
        self.set_secure_cookie("user", str(user.id))
        log.debug('User %s created sucessfully', user)
        return self.redirect("/")

    def _authorisation(self):
        email = self.get_argument('email', None)
        password = self.get_argument('password', None)
        if not email or not password:
            raise HTTPError(400, log_message='Wrong auth data.')

        user = User.get_by_email(email=email)
        if not user:
            return self.login_error_redirect(msg="Пользователь с таким email не найден.")

        if not user.check_password(password):
            return self.login_error_redirect(msg="Неверный email или пароль.")

        self.set_secure_cookie("user", str(user.id))
        return self.redirect("/")
