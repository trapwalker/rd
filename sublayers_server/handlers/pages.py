# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

import tornado.web
import tornado.gen
from tornado.options import options  # todo: (!) use application.options

from random import randint

from sublayers_common.user_profile import User
from sublayers_site.handlers.site_auth import clear_all_cookie


class PlayHandler(BaseHandler):
    def get(self):
        user = self.current_user
        if user:
            #if user.is_quick_user and user.car_die:
            #    self.redirect('/#quick')
            #else:
            self.render("play.html", ws_port=options.ws_port, map_link=options.map_link)
        else:
            self.redirect(self.get_login_url())


class MobilePlayHandler(BaseHandler):
    @tornado.gen.coroutine
    def _quick_registration(self):
        qg_car_index = self.get_argument('qg_car_index', 0)
        nickname = self.get_argument('username', 'mobile_user')
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

        # todo: Проверять введенный username, а, если занят, предлагать рандомизированный пока не будет введен
        # укниальный среди быстрых игроков.
        login_free = False
        email = ''
        password = str(randint(0,999999))
        username = nickname + str(randint(0,999999))
        while not login_free:
            email = username + '@' + username  # todo: Предотвратить заполнение email заведомо ложной информацией
            login_free = ((yield User.get_by_email(email=email)) is None) and \
                         ((yield User.get_by_name(name=username)) is None)
            if not login_free:
                username = nickname + str(randint(0,999999))

        user = User(name=username, email=email, raw_password=password, car_index=qg_car_index, quick=True)
        result = yield user.save()
        clear_all_cookie(self)
        self.set_secure_cookie("user", str(user.id))

    @tornado.gen.coroutine
    def get(self):
        yield self._quick_registration()
        self.render("mobile/play.html", ws_port=options.ws_port, map_link=options.map_link, host_name=options.mobile_host)
