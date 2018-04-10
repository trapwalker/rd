# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_common.user_profile import User
from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_common.creater_agent import create_agent
from sublayers_common import mailing

import tornado.gen
from tornado.web import RequestHandler, HTTPError
from tornado.auth import GoogleOAuth2Mixin, OAuth2Mixin, TwitterMixin, FacebookGraphMixin, AuthError, OpenIdMixin
from tornado.httputil import url_concat
from tornado.httpclient import HTTPClient, AsyncHTTPClient, HTTPError
import json
import hashlib
import urllib
from tornado.options import options
from random import randint
import re

import functools
import hmac


LOGIN_RE = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_-]{3,19}$')


def clear_all_cookie(handler):
    # handler.clear_cookie("forum_user")
    # handler.clear_cookie("myforum_k")
    # handler.clear_cookie("myforum_sid")
    # handler.clear_cookie("myforum_u")
    handler.clear_cookie("user")


def get_forum_cookie_str(username):
    cookie_format = u"{}|{}".format
    for_hash_str = u"{}{}".format(username, options.forum_cookie_secret)
    hash = hashlib.md5(for_hash_str.encode('utf-8')).hexdigest()
    return cookie_format(username, hash)


class LogoutHandler(BaseSiteHandler):
    def post(self):
        clear_all_cookie(self)

    def get(self):
        clear_all_cookie(self)
        self.redirect('/')

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

    def post(self):
        action = self.get_argument('action', None)
        if action == 'reg':
            self._registration()
        elif action == 'quick_reg':
            self._quick_registration()
        elif action == 'auth':
            self._authorisation()
        elif action == 'next':
            self._next_reg_step()
        elif action == 'back':
            self._back_reg_step()
        elif action == 'drop':
            self._drop_character()
        else:
            raise HTTPError(405, log_message='Wrong action {}.'.format(action))

    def _drop_character(self):
        clear_all_cookie(self)

        # todo: дисконект с игрового сервера

        user = self.current_user
        user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
        user.save()

        # Пытаемся удалить старых агентов
        Agent.objects.filter(user_id=str(user.pk)).delete()
        agent_example = Agent.objects.filter(user_id=str(user.pk)).first()
        if agent_example is None:
            agent_example = create_agent(registry=self.application.reg, user=user)
        else:
            log.error('Agent was not delete user={}'.format(user))

        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))
        self.finish({'status': 'success'})

    def _registration(self):
        clear_all_cookie(self)
        email = self.get_argument('email', None)
        password = self.get_argument('password', None)
        if (
            not email
            or not password
            or len(email) > 100  # todo: Вынести лимиты в константы
            or email.count('@') != 1
        ):
            self.finish({'status': 'fail_wrong_input'})
            return

        if User.get_by_email(email=email):
            self.finish({'status': 'fail_exist_email'})
            return

        user = User(email=email, raw_password=password, lang=self.user_lang)
        log.debug('!! User {user} set lang as "{user.lang}" by creation'.format(user=user))
        user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
        user.save()
        try:
            conf_email_template = mailing.get_email_confirmation_template(user.lang)

            msg = conf_email_template(
                adr_to=email,
                token=user.auth.standard.email_confirmation_token.hex,
                adr_from=options.email_from,
                site=options.site_host,
                site_proto=options.site_host_proto,
            )
            log.debug(u'Confirmation email with token {user.auth.standard.email_confirmation_token.hex}: {msg}'.format(
                **locals()))
            msg.send(self.application.email_sender)
        except Exception as e:
            log.exception('Error where confitmation email sending: %s', e)
        # todo: Вывести в консоль уведомление об отправке письма для подтверждания

        agent_example = Agent.objects.filter(user_id=str(user.pk)).first()
        if agent_example is None:
            agent_example = create_agent(registry=self.application.reg, user=user)

        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))

        # log.debug('User {} created sucessfully: {}'.format(user, result.raw_result))

        self.finish({'status': 'success'})

    def _quick_registration(self):
        qg_car_index = self.get_argument('qg_car_index', 0)
        nickname = self.get_argument('username', None)

        quick_user = None
        if self.current_user:
            quick_user = self.current_user if self.current_user.quick else None
            if quick_user:
                if '_'.join(quick_user.name.split('_')[:-1]) == nickname:  # todo: Вынести эту логику в явном виде
                    quick_user.car_index = qg_car_index
                    quick_user.teaching_state = ''
                    quick_user.save()
                    self.finish({'status': u'Такой пользователь существует'})
                    return

        try:
            str(nickname)
        except UnicodeEncodeError:
            log.warning('None ascii character in nickname: %r', nickname)
            self.send_error(403)
            return

        if not nickname or (len(nickname) > 100):  # todo: Вынести лимиты в константы
            # self.finish({'status': 'Некорректные входные данные'})
            self.send_error(403)
            return

        # укниальный среди быстрых игроков.
        login_free = False
        email = u''
        password = str(randint(0,999999))
        while not login_free:
            username = u'{}_{}'.format(nickname, str(randint(0, 999999)))
            email = u'{}@{}'.format(username, username)
            login_free = (
                User.get_by_email(email=email) is None and
                User.get_by_name(name=username) is None
            )

        user = User(name=username, email=email, raw_password=password, car_index=qg_car_index, quick=True)
        user.save()
        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))
        # log.debug('User {} created sucessfully: {}'.format(user, result.raw_result))
        self.finish({'status': u'Временный пользователь создан'})

    # @tornado.gen.coroutine
    # def _forum_setup(self, data):
    #     http = AsyncHTTPClient()
    #
    #     body = urllib.urlencode({
    #         "user_email": data['user_email'],
    #         "username": data['username'],
    #         "user_password": data['user_password'],
    #     })
    #
    #     response = yield http.fetch(request=options.forum_auth_script, method="POST",
    #                           headers={'Content-Type': 'application/x-www-form-urlencoded'}, body=body)
    #
    #     res = json.loads(response.body)
    #
    #     if res.get('error', None):
    #         log.info('Forum register failed with error: {}'.format(res['error']))
    #         raise tornado.gen.Return(False)
    #     else:
    #         raise tornado.gen.Return(res.get('u_id'))

    def _authorisation(self):
        clear_all_cookie(self)
        email = self.get_argument('email', None)
        password = self.get_argument('password', None)
        if not email or not password:
            self.finish({'status': 'fail'})
            return

        user = User.get_by_email(email=email)
        if not user:
            self.finish({'status': 'fail'})
            return

        if not user.check_password(password):
            self.finish({'status': 'fail'})
            return
        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))
        # self.set_cookie("forum_user", get_forum_cookie_str(user.name))
        # return self.redirect("/")
        self.finish({'status': 'success'})

    def _next_reg_step(self):
        user = self.current_user
        if user is None or not isinstance(user, User):
            self.finish({'status': 'fail_wrong_input'})
            return
        # Cмотреть на статус пользователя, понять что делать и как это обработать
        if user.registration_status == 'nickname':
            username = self.get_argument('username', None)
            avatar_index = self.get_argument('avatar_index', None)
            class_index = self.get_argument('class_index', None)
            class_node_hash = self.get_argument('class_node_hash', None)

            # todo: проверить ник на допустимые символы
            username_format_ok = LOGIN_RE.match(username)
            log.debug('Username test %r: %s', username, 'OK' if username_format_ok else 'FAIL')
            if (
                avatar_index is None or
                class_index is None or
                class_node_hash is None or
                username is None or
                not isinstance(username, basestring) or
                username == '' or
                len(username) > 100 or
                not username_format_ok
            ):
                self.finish({'status': 'fail_wrong_input'})
                return

            try:
                str(username)
            except UnicodeEncodeError:
                log.warning('None ascii character in nickname: %r', username)
                self.finish({'status': 'fail_wrong_input'})
                return

            # Проверяем свободен ли ник
            if user.name != username and User.get_by_name(name=username):
                self.finish({'status': 'fail_exist_nickname'})
                return

            agent_ex = Agent.objects.filter(user_id=str(user.pk)).first()
            if agent_ex is None:  # todo: Определить вероятность такой проблемы, рассмотреть пути решения
                # todo: warning
                log.warning('Agent not found registration_status={}'.format(user.registration_status))
                self.send_error(status_code=404)
                return

            # Получаем ссылку на аватар
            avatar_link = ''
            role_class_ex = None
            try:
                avatar_index = int(avatar_index)
                avatar_link = self.application.reg.get('/registry/world_settings').avatar_list[avatar_index]
                role_class_ex = self.application.reg.get(class_node_hash)
            except:
                # todo: Обработать исключение правильно
                self.finish({'status': 'fail_wrong_input'})
                return

            agent_ex.profile.set_role_class(role_class_ex=role_class_ex, registry=self.application.reg)
            user.role_class_uri = role_class_ex.uri

            # Сброс всех перков
            agent_ex.profile.perks = []

            user.avatar_link = avatar_link
            user.name = username
            agent_ex.login = username
            user.registration_status = 'settings'
            agent_ex.save()
            user.save()
            self.finish({'status': 'success'})

        elif user.registration_status == 'settings':
            # todo: обработать скилы и перки
            user.registration_status = 'chip'
            user.save()

            # Устанавливаем порядковый номер пользователя
            ordinal_number = user.assign_ordinal_number()
            if ordinal_number is None:
                log.warning('Dont set Ordinal_number for user')

            self.finish({'status': 'success'})

        elif user.registration_status == 'chip':
            # todo: изменить статус на register и наконец-то зарегать юзера на форуме!
            user.registration_status = 'register'

            # регистрация на форуме
            email = user.auth.standard.email
            username = user.name
            password = user.auth.standard.password
            if isinstance(password, unicode):
                password = password.encode('utf-8')

            # forum_id = yield self._forum_setup({
            #     'user_email': email,
            #     'username': username,
            #     'user_password': password,
            # })
            # if not forum_id:
            #     self.finish({'status': 'Ошибка регистрации на форуме.'})
            #     log.info('User <{}> not registered on forum!'.format(username))
            #     return
            # self.set_cookie("forum_user", get_forum_cookie_str(username))

            user.save()
            self.finish({'status': 'success'})

    def _back_reg_step(self):
        user = self.current_user
        if user is None or not isinstance(user, User):
            self.finish({'status': 'fail_wrong_input'})
            return
        # Cмотреть на статус пользователя, понять что делать и как это обработать
        if user.registration_status == 'nickname':
            # todo: Вариант1: с таким статусом нельзя нажать назад.
            # todo: Вариант2: удалить пользователя.
            clear_all_cookie(self)
        elif user.registration_status == 'settings':
            user.registration_status = 'nickname'
            user.save()
        elif user.registration_status == 'chip':
            user.registration_status = 'settings'
            user.save()


# class RegisterOldUsersOnForum(StandardLoginHandler):
#     def get(self):
#         users = User.objects.all()
#         count_regs = 0
#         for user in users:
#             # регистрация на форуме
#             email = user.auth.standard.email
#             username = user.name
#             password = user.auth.standard.password
#             if isinstance(password, unicode):
#                 password = password.encode('utf-8')
#
#             forum_id = yield self._forum_setup({
#                 'user_email': email,
#                 'username': username,
#                 'user_password': password,
#             })
#             if forum_id:
#                 self.write("{}  register<br>".format(str(user.name)))
#                 count_regs += 1
#
#         self.finish('done! {} users registered on forum'.format(count_regs))


class SetForumUserAuth(StandardLoginHandler):
    def get(self):
        user = self.current_user
        if user and user.name:
            # self.set_cookie("forum_user", get_forum_cookie_str(user.name))
            self.finish("OK")
        else:
            self.finish("Not auth")


class SteamLoginHandler(RequestHandler):
    @tornado.gen.coroutine
    def get(self):
        ticket = self.get_argument('ticket', False)
        if ticket and self.settings.get("steam_auth", None):
            http_client = AsyncHTTPClient()
            params = {
                "ticket": ticket,
                "key": self.settings["steam_auth"]["key"],
                "appid": self.settings["steam_auth"]["appid"],
            }
            try:
                response = yield http_client.fetch(url_concat("https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/", params),
                                             method="GET")
                response = json.loads(response.body)
                response = response and response.get("response", None)
                params = response and response.get("params", None)
                if params and params.get("result", None) == "OK" and params.get("steamid", None):
                    user_steamid = params["steamid"]
                    # print 'User SteamID: {}'.format(user_steamid)
                    # todo: поискать в базе, если нет, то зарегистрировать и перекинуть на ввод никнейма
                    cookie = self._on_get_user_info(user_steamid)
                    if cookie is not None:
                        self.set_secure_cookie("user", cookie)
                        self.set_cookie("steam_registration_cookie", user_steamid, expires_days=365)
                        # info: Нельзя с авторизацией через стим играть в браузере. Поэтому только для клиента
                        self.finish("OK")
                    else:
                        self.send_error(404, reason="User authorisation failed")
                        #self.redirect("/login?msg=Ошибка%20авторизации")
                    return

            except HTTPError as e:  # HTTPError is raised for non-200 responses; the response can be found in e.response
                print("Error: " + str(e))
            except Exception as e:   # Other errors are possible, such as IOError.
                print("Error: " + str(e))
            http_client.close()

        # todo: self.send_error(5XX) или 4XX
        self.finish('Error')

    def _on_get_user_info(self, user):
        steam_id = user
        if steam_id:
            profile_user = User.get_by_steam_id(uid=steam_id)
            if not profile_user:
                # Регистрация
                profile_user = User(steam_id=steam_id)
                profile_user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
                profile_user.save()

                log.info('Register new Profile with SteamID: {}'.format(steam_id))

            # Авторизация
            return str(profile_user.pk)


class SteamOpenIDHandler(RequestHandler, OpenIdMixin):
    _OPENID_ENDPOINT = "https://steamcommunity.com/openid/login"

    @tornado.gen.coroutine
    def get(self):
        req = self.request
        electron = self.get_argument("mode", "") == "electron"
        redirect_uri = '{p}://{h}/{path}{mode}'.format(
            p=req.protocol,
            h=req.host,
            path="site_api/auth/steam_openid",
            mode="?mode=electron" if electron else "",
        )
        if not self.settings.get('steam_auth', None):
            self.send_error(status_code=501)
            return

        if self.get_argument("openid.mode", None):
            user = yield self.get_authenticated_user()
            cookie = self._on_get_user_info(user['claimed_id'].split('/')[-1])
            if cookie is not None:
                self.set_secure_cookie("user", cookie)
                self.redirect("/static/steam_auth_finish.html")
            else:
                self.send_error(404, reason="User authorisation failed")
            return
        else:
            yield self.authenticate_redirect(callback_uri=redirect_uri)

    def _on_get_user_info(self, user):
        steam_id = user
        if steam_id:
            profile_user = User.get_by_steam_id(uid=steam_id)
            if not profile_user:
                # Регистрация
                profile_user = User(steam_id=steam_id)
                profile_user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
                profile_user.save()

                log.info('Register new Profile with SteamID: {}'.format(steam_id))

            # Авторизация
            return str(profile_user.pk)


class GoogleLoginHandler(RequestHandler, GoogleOAuth2Mixin):
    @tornado.gen.coroutine
    def get(self):
        code = self.get_argument('code', False)
        req = self.request
        electron = self.get_argument("mode", "") == "electron"
        redirect_uri = '{p}://{h}/{path}{mode}'.format(
            p=req.protocol,
            h=req.host,
            path="site_api/auth/google",
            mode="?mode=electron" if electron else "",
        )

        if not self.settings.get('google_oauth', None):
            self.send_error(status_code=501)
            return

        if code:
            access = yield self.get_authenticated_user(
                redirect_uri=redirect_uri,
                code=code)
            user = yield self.oauth2_request(
                "https://www.googleapis.com/oauth2/v1/userinfo",
                access_token=access["access_token"])

            cookie = self._on_get_user_info(user)
            if cookie is not None:
                self.set_secure_cookie("user", cookie)
                if electron:
                    self.redirect("/?mode=electron")
                else:
                    self.redirect("/#start")
            else:
                self.redirect("/login?msg=Ошибка%20авторизации")
        else:
            yield self.authorize_redirect(
                redirect_uri=redirect_uri,
                client_id=self.settings['google_oauth']['key'],
                scope=['profile'],
                response_type='code',
                extra_params={'approval_prompt': 'auto'})

    def _on_get_user_info(self, user):
        if user:
            body_id = str(user.get(u'id', ''))
            if not body_id:
                return None
            profile_user = User.get_by_google_id(uid=body_id)
            if not profile_user:
                # Регистрация
                profile_user = User(google_id=body_id)
                profile_user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
                profile_user.save()

                log.info('Register new Profile with GoogleID: {}'.format(body_id))

            # Авторизация
            return str(profile_user.pk)


class VKLoginHandler(RequestHandler, OAuth2Mixin):
    _OAUTH_AUTHORIZE_URL = "https://oauth.vk.com/authorize"
    _OAUTH_ACCESS_TOKEN_URL = "https://oauth.vk.com/access_token"
    _OAUTH_SETTINGS_KEY = "vk_oauth"

    @tornado.gen.coroutine
    def get(self):
        code = self.get_argument('code', False)
        req = self.request
        electron = self.get_argument("mode", "") == "electron"
        redirect_uri = '{p}://{h}/{path}{mode}'.format(
            p=req.protocol,
            h=req.host,
            path="site_api/auth/vk",
            mode="?mode=electron" if electron else "",
        )

        if not self.settings.get(self._OAUTH_SETTINGS_KEY, None):
            self.send_error(status_code=501)
            return

        if code:
            http = HTTPClient()
            body = urllib.urlencode({
                "redirect_uri": redirect_uri,
                "code": code,
                "client_id": self.settings[self._OAUTH_SETTINGS_KEY]['key'],
                "client_secret": self.settings[self._OAUTH_SETTINGS_KEY]['secret'],
                "grant_type": "authorization_code",
            })

            response = http.fetch(request=self._OAUTH_ACCESS_TOKEN_URL, method="POST",
                                  headers={'Content-Type': 'application/x-www-form-urlencoded'}, body=body)

            acc_token = json.loads(response.body)['access_token']

            args = {"access_token": acc_token}

            path = url_concat('https://api.vk.com/method/users.get', args)
            response = http.fetch(request=path,
                                  method="GET", headers={'Content-Type': 'application/x-www-form-urlencoded'})

            cookie = self._on_get_user_info(response)
            self.clear_cookie("action")
            if cookie is not None:
                self.set_secure_cookie("user", cookie)
                if electron:
                    self.redirect("/?mode=electron")
                else:
                    self.redirect("/#start")
            else:
                self.redirect("/login?msg=Ошибка%20авторизации")
        else:
            yield self.authorize_redirect(
                redirect_uri=redirect_uri,
                client_id=self.settings[self._OAUTH_SETTINGS_KEY]['key'],
                scope=[],
                response_type='code',
                extra_params={"v": "5.74", "display": "page"}
            )

    def _on_get_user_info(self, response):
        if (response.code == 200) and (response.error is None):
            body_id = str(json.loads(response.body)['response'][0]['id'])
            if not body_id:
                return None
            profile_user = User.get_by_vk_id(uid=body_id)
            if not profile_user:
                print body_id
                # Регистрация
                profile_user = User(vk_id=body_id)
                profile_user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
                profile_user.save()

                log.info('Register new Profile with VK ID: {}'.format(body_id))

            # Авторизация
            return str(profile_user.pk)


class TwitterLoginHandler(RequestHandler, TwitterMixin):
    @tornado.gen.coroutine
    def get(self):
        req = self.request
        electron = self.get_argument("mode", "") == "electron"
        redirect_uri = '{p}://{h}/{path}{mode}'.format(
            p=req.protocol,
            h=req.host,
            path="site_api/auth/twitter",
            mode="?mode=electron" if electron else "",
        )

        if not self.settings.get('twitter_consumer_key', None) or not self.settings.get('twitter_consumer_secret', None):
            self.send_error(status_code=501)
            return

        if self.get_argument("oauth_token", None):
            user = yield self.get_authenticated_user()
            cookie = self._on_get_user_info(user)
            if cookie is not None:
                self.set_secure_cookie("user", cookie)
                if electron:
                    self.redirect("/?mode=electron")
                else:
                    self.redirect("/#start")
            else:
                self.redirect("/login?msg=Ошибка%20авторизации")
        else:
            yield self.authorize_redirect(callback_uri=redirect_uri)

    def _on_get_user_info(self, user):
        if user:
            body_id = str(user.get(u'id', ''))
            if not body_id:
                return None
            profile_user = User.get_by_twitter_id(uid=body_id)
            if not profile_user:
                # Регистрация
                profile_user = User(twitter_id=body_id)
                profile_user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
                profile_user.save()

                log.info('Register new Profile with twitter_id: {}'.format(body_id))

            # Авторизация
            return str(profile_user.pk)


class FacebookLoginHandler(RequestHandler, FacebookGraphMixin):
    @tornado.gen.coroutine
    def get(self):
        if not self.settings.get('facebook_api_key', None) or not self.settings.get('facebook_secret', None):
            self.send_error(status_code=501)
            return
        req = self.request
        electron = self.get_argument("mode", "") == "electron"
        redirect_uri = '{p}://{h}/{path}{mode}'.format(
            p=req.protocol,
            h=req.host,
            path="site_api/auth/facebook",
            mode="?mode=electron" if electron else "",
        )

        code = self.get_argument("code", False)
        if code:
            user = yield self.get_authenticated_user(
                redirect_uri=redirect_uri,
                client_id=self.settings["facebook_api_key"],
                client_secret=self.settings["facebook_secret"],
                code=code)
            cookie = self._on_get_user_info_fb(user)
            if cookie is not None:
                self.set_secure_cookie("user", cookie)
                if electron:
                    self.redirect("/?mode=electron")
                else:
                    self.redirect("/#start")
            else:
                self.redirect("/login?msg=Ошибка%20авторизации")
        else:
            yield self.authorize_redirect(
                redirect_uri=redirect_uri,
                client_id=self.settings["facebook_api_key"],
                extra_params={"scope": "public_profile"})

    def _on_get_user_info_fb(self, user):
        if user:
            body_id = str(user.get(u'id', ''))
            if not body_id:
                return None
            profile_user = User.get_by_fb_id(uid=body_id)
            if not profile_user:
                # Регистрация
                profile_user = User(fb_id=body_id)
                profile_user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
                profile_user.save()

                log.info('Register new Profile with Facebook: {}'.format(body_id))

            # Авторизация
            return str(profile_user.pk)

    # Перекрытый метод, так как у них там использовались другие функции для получения args из response.body
    def _on_access_token(self, redirect_uri, client_id, client_secret,
                         future, fields, response):
        if response.error:
            future.set_exception(AuthError('Facebook auth error: %s' % str(response)))
            return
        args = json.loads(response.body)
        session = {
            "access_token": args["access_token"],
            "expires": args.get("expires")
        }

        self.facebook_request(
            path="/me",
            callback=functools.partial(
                self._on_get_user_info, future, session, fields),
            access_token=session["access_token"],
            appsecret_proof=hmac.new(key=client_secret.encode('utf8'),
                                     msg=session["access_token"].encode('utf8'),
                                     digestmod=hashlib.sha256).hexdigest(),
            fields=",".join(fields)
        )
