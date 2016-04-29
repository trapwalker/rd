# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_common.user_profile import User

from tornado.web import HTTPError
from tornado.httpclient import AsyncHTTPClient
import tornado.gen
import urllib
import hashlib
import json
from tornado.options import options
from random import randint


def clear_all_cookie(handler):
    handler.clear_cookie("forum_user")
    handler.clear_cookie("myforum_k")
    handler.clear_cookie("myforum_sid")
    handler.clear_cookie("myforum_u")
    handler.clear_cookie("user")


class LogoutHandler(BaseSiteHandler):
    def post(self):
        clear_all_cookie(self)


# class BaseLoginHandler(BaseSiteHandler):
#     def login_error_redirect(self, doseq=0, **kw):
#         url = urllib.urlencode([
#             (k, v.encode('utf-8') if isinstance(v, unicode) else str(v))
#             for k, v in kw.items()
#         ], doseq)
#         self.redirect("/login?{}".format(url))  # todo: use reverse resolver


class StandardLoginHandler(BaseSiteHandler):
    def get(self):
        self.redirect('/#start')

    @tornado.gen.coroutine
    def post(self):
        action = self.get_argument('action', None)
        if action == 'reg':
            yield self._registration()
        elif action == 'quick_reg':
            yield self._quick_registration()
        elif action == 'auth':
            yield self._authorisation()
        elif action == 'next':
            yield self._next_reg_step()
        elif action == 'back':
            yield self._back_reg_step()
        else:
            raise HTTPError(405, log_message='Wrong action {}.'.format(action))

    @tornado.gen.coroutine
    def _registration(self):
        clear_all_cookie(self)
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
            self.finish({'status': 'fail_wrong_input'})
            return
        if (yield User.get_by_email(email=email)):
            self.finish({'status': 'fail_exist_email'})
            return
        if (yield User.get_by_name(name=username)):
            self.finish({'status': 'fail_exist_nickname'})
            return
        # регистрация на форуме
        # forum_id = yield self._forum_setup({
        #     'user_email': email,
        #     'username': username,
        #     'user_password': password,
        # })
        # if not forum_id:
        #     self.finish({'status': 'Ошибка регистрации на форуме.'})
        #     log.info('User <{}> not registered on forum!'.format(username))
        #     return
        user = User(name=username, email=email, raw_password=password)
        user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
        result = yield user.save()
        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))
        self.set_cookie("forum_user", self._forum_cookie_setup(username))
        # log.debug('User {} created sucessfully: {}'.format(user, result.raw_result))
        self.finish({'status': 'success'})

    @tornado.gen.coroutine
    def _quick_registration(self):
        qg_car_index = self.get_argument('qg_car_index', 0)
        nickname = self.get_argument('username', None)
        if self.current_user:
            quick_user = self.current_user if self.current_user.quick else None
            if quick_user and quick_user.name == nickname:
                quick_user.car_index = qg_car_index
                quick_user.car_die = False
                yield quick_user.save()
                log.info('Save quick_user.car_die = False')
                self.finish({'status': 'Такой пользователь существует'})
                return

        if not nickname or (len(nickname) > 100):  # todo: Вынести лимиты в константы
            # self.finish({'status': 'Некорректные входные данные'})
            self.send_error(403)
            return

        login_free = False
        email = ''
        password = str(randint(0,999999))
        username = nickname + str(randint(0,999999))
        while not login_free:
            email = username + '@' + username
            login_free = ((yield User.get_by_email(email=email)) is None) and \
                         ((yield User.get_by_name(name=username)) is None)
            if not login_free:
                username = nickname + str(randint(0,999999))

        user = User(name=username, email=email, raw_password=password, car_index=qg_car_index, quick=True)
        result = yield user.save()
        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))
        # log.debug('User {} created sucessfully: {}'.format(user, result.raw_result))
        self.finish({'status': 'Временный пользователь создан'})

    @tornado.gen.coroutine
    def _forum_setup(self, data):
        http = AsyncHTTPClient()

        body = urllib.urlencode({
            "user_email": data['user_email'],
            "username": data['username'],
            "user_password": data['user_password'],
        })

        response = yield http.fetch(request=options.forum_auth_script, method="POST",
                              headers={'Content-Type': 'application/x-www-form-urlencoded'}, body=body)

        res = json.loads(response.body)

        if res.get('error', None):
            log.info('Forum register failed with error: {}'.format(res['error']))
            raise tornado.gen.Return(False)
        else:
            raise tornado.gen.Return(res.get('u_id'))

    def _forum_cookie_setup(self, username):
        cookie_format = "{}|{}".format
        for_hash_str = "{}{}".format(username, options.forum_cookie_secret)
        hash = hashlib.md5(for_hash_str).hexdigest()
        return cookie_format(username, hash)

    @tornado.gen.coroutine
    def _authorisation(self):
        clear_all_cookie(self)
        email = self.get_argument('email', None)
        password = self.get_argument('password', None)
        if not email or not password:
            self.finish({'status': 'fail'})
            return

        user = yield User.get_by_email(email=email)
        if not user:
            self.finish({'status': 'fail'})
            return

        if not user.check_password(password):
            self.finish({'status': 'fail'})
            return
        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))
        self.set_cookie("forum_user", self._forum_cookie_setup(user.name))
        # return self.redirect("/")
        self.finish({'status': 'success'})

    @tornado.gen.coroutine
    def _next_reg_step(self):
        user = self.current_user
        # todo: смотреть на статус пользователя, понять что делать и как это обработать
        if user.registration_status == 'nickname':
            username = self.get_argument('nickname')
            # todo: проверить свободен ли ник, считать другие параметры, записать, обновить статус, отправить на клиент инструкции "что делать дальше"
        elif user.registration_status == 'settings':
            pass
        elif user.registration_status == 'chip':
            # todo: изменить статус на register и наконец-то зарегать юзера на форуме!
            pass

    @tornado.gen.coroutine
    def _back_reg_step(self):
        user = self.current_user
        # todo: смотреть на статус пользователя, понять что делать и как это обработать
        if user.registration_status == 'nickname':
            # todo: с таким статусом нельзя нажать назад!
            pass
        elif user.registration_status == 'settings':
            # todo: просто изменить статус и отправить на клиент инструкции по тому, какое окно открыть
            user.registration_status = 'nickname'
            yield user.save()
        elif user.registration_status == 'chip':
            # todo: просто изменить статус и отправить на клиент инструкции по тому, какое окно открыть
            user.registration_status = 'settings'
            yield user.save()
