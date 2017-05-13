# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_site.handlers.base_site import BaseSiteHandler
from sublayers_common.user_profile import User
from sublayers_server.model.registry_me.classes.agents import Agent

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

    @tornado.gen.coroutine
    def post(self):
        action = self.get_argument('action', None)
        if action == 'reg':
            yield self._registration()
        elif action == 'quick_reg':
            self._quick_registration()
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

        user = User(email=email, raw_password=password)
        user.registration_status = 'nickname'  # Теперь ждём подтверждение ника, аватарки и авы
        user.save()

        agent_example = Agent.objects.get(user_id=str(user._id))
        if agent_example is None:
            agent_example = self.application.reg['agents/user'].instantiate(
                #storage=self.application.reg_agents,
                user_id=str(user._id),
                name=str(user._id),
                fixtured=False,
            )
            yield agent_example.load_references()
            agent_example.teaching_flag = False
            agent_example.quick_flag = False
            yield agent_example.save(upsert=True)

        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))

        # log.debug('User {} created sucessfully: {}'.format(user, result.raw_result))

        self.finish({'status': 'success'})

    @tornado.gen.coroutine
    def _quick_registration(self):
        qg_car_index = self.get_argument('qg_car_index', 0)
        nickname = self.get_argument('username', None)

        quick_user = None
        if self.current_user:
            quick_user = self.current_user if self.current_user.quick else None
            if quick_user:
                if '_'.join(quick_user.name.split('_')[:-1]) == nickname:
                    quick_user.car_index = qg_car_index
                    quick_user.teaching_state = ''
                    yield quick_user.save()
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
        username = u'{}_{}'.format(nickname, str(randint(0, 999999)))
        while not login_free:
            email = u'{}@{}'.format(username, username)
            login_free = ((yield User.get_by_email(email=email)) is None) and \
                         ((yield User.get_by_name(name=username)) is None)
            if not login_free:
                username = u'{}_{}'.format(nickname, str(randint(0, 999999)))

        user = User(name=username, email=email, raw_password=password, car_index=qg_car_index, quick=True)
        result = yield user.save()
        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))
        # log.debug('User {} created sucessfully: {}'.format(user, result.raw_result))
        self.finish({'status': u'Временный пользователь создан'})

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
        self.set_cookie("forum_user", get_forum_cookie_str(user.name))
        # return self.redirect("/")
        self.finish({'status': 'success'})

    @tornado.gen.coroutine
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
            if ((avatar_index is None) or (class_index is None) or (class_node_hash is None) or
                    (username is None) or (not isinstance(username, basestring)) or
                    (username == '') or (len(username) > 100)):
                self.finish({'status': 'fail_wrong_input'})
                return

            # Проверяем свободен ли ник
            if (user.name != username) and (yield User.get_by_name(name=username)):
                self.finish({'status': 'fail_exist_nickname'})
                return

            agent_ex = yield Agent.objects.get(user_id=str(user._id))
            if agent_ex is None:  # todo: Определить вероятность такой проблемы, реализовать пути решения
                # todo: warning
                self.send_error(status_code=404)
                return

            # Получаем ссылку на аватар
            avatar_link = ''
            role_class_ex = None
            try:
                avatar_index = int(avatar_index)
                avatar_link = self.application.reg['world_settings'].avatar_list[avatar_index]
                role_class_ex = self.application.reg.objects.get_cached(class_node_hash)
            except:
                # todo: Обработать исключение правильно
                self.finish({'status': 'fail_wrong_input'})
                return

            agent_ex.role_class = role_class_ex
            # Установка классового навыка
            for class_skill in role_class_ex.class_skills:
                # todo: Перебирать объекты реестра
                if class_skill.target in ['driving', 'shooting', 'masking', 'leading', 'trading', 'engineering']:
                    skill = getattr(agent_ex, class_skill.target)
                    skill.mod = class_skill

            user.avatar_link = avatar_link
            user.name = username
            user.registration_status = 'settings'
            yield agent_ex.save()
            yield user.save()
            self.finish({'status': 'success'})

        elif user.registration_status == 'settings':
            # todo: обработать скилы и перки
            user.registration_status = 'chip'
            yield user.save()

            # Устанавливаем порядковый номер пользователя
            ordinal_number = yield user.assign_ordinal_number()
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
            self.set_cookie("forum_user", get_forum_cookie_str(username))

            yield user.save()
            self.finish({'status': 'success'})

    @tornado.gen.coroutine
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
            yield user.save()
        elif user.registration_status == 'chip':
            user.registration_status = 'settings'
            yield user.save()


class RegisterOldUsersOnForum(StandardLoginHandler):
    @tornado.gen.coroutine
    def get(self):
        users = yield User.objects.filter({}).find_all()
        count_regs = 0
        for user in users:
            # регистрация на форуме
            email = user.auth.standard.email
            username = user.name
            password = user.auth.standard.password
            if isinstance(password, unicode):
                password = password.encode('utf-8')

            forum_id = yield self._forum_setup({
                'user_email': email,
                'username': username,
                'user_password': password,
            })
            if forum_id:
                self.write("{}  register<br>".format(str(user.name)))
                count_regs += 1

        self.finish('done! {} users registered on forum'.format(count_regs))


class SetForumUserAuth(StandardLoginHandler):
    def get(self):
        user = self.current_user
        if user and user.name:
            self.set_cookie("forum_user", get_forum_cookie_str(user.name))
            self.finish("OK")
        else:
            self.finish("Not auth")
