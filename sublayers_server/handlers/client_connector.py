# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

import json
import tornado.ioloop
import tornado.websocket
import tornado.web
import tornado.gen

from sublayers_common.handlers.base import BaseHandler

from random import randint

from sublayers_common.user_profile import User
from sublayers_site.handlers.site_auth import clear_all_cookie


class AgentSocketHandler(tornado.websocket.WebSocketHandler, BaseHandler):

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def check_origin(self, origin):
        log.warning('origin=%s', origin)
        # todo: reject connections from wrong servers
        return True

    @tornado.gen.coroutine
    def open(self):
        # todo: make agent_init event
        print 'new connect open !!!'
        self._ping_timeout_handle = None
        self.ping_number = 0
        self.agent = None
        user = self.current_user
        if not user:
            user = yield self._quick_registration()
            self.current_user = user
        assert user
        log.info('!!! Open User connection: %s%s', self.current_user, user.quick)
        self.application.clients.append(self)
        # log.debug('Cookies: %s', self.cookies)
        srv = self.application.srv

        if user.quick:
            agent = yield srv.api.get_agent_quick_game(user, do_disconnect=True)  # todo: Change to make=False
        else:
            agent = yield srv.api.get_agent(user, make=True, do_disconnect=True)  # todo: Change to make=False

        if agent is None:
            log.warning('Agent not found in database')  # todo: ##fixit
            return
        self.agent = agent
        agent.on_connect(connection=self)
        self._do_ping()

    def on_close(self):
        if self._ping_timeout_handle:
            log.debug('Cancel ping for agent {}'.format(self.agent))
            tornado.ioloop.IOLoop.instance().remove_timeout(self._ping_timeout_handle)
            self._ping_timeout_handle = None

        if self.agent:
            log.info('Agent socket %r Closed', self)
            self.agent.on_disconnect(self)
        else:
            log.warning('Socket Closed. Socket %r has not agent', self)
        self.application.clients.remove(self)

    def on_message(self, message):
        # log.debug("Got message from %s: %r", self.agent, message)
        result = self.agent.api.__rpc_call__(message)
        self.send(result)

    def send(self, data):
        #log.debug('\n\nconnection.send(%s)', data)
        try:
            # todo: Разобраться с этой странной редкой ошибкой. Почему-то дек буффера торнадо оказывается пустым
            self.write_message(data)
        except Exception as e:
            log.exception('Fucking scarry deque error (%r) with data=%r', e, data)
            raise e

    def _do_ping(self):
        t = self.application.srv.get_time()
        # log.debug('Send ping packet #{self.ping_number} at {t} to {self.agent}'.format(self=self, t=t))
        self.ping(json.dumps(dict(time=t, number=self.ping_number)))
        self.ping_number += 1
        self._ping_timeout_handle = tornado.ioloop.IOLoop.instance().call_later(29, self._do_ping)  # todo: const 29

    @tornado.gen.coroutine
    def _quick_registration(self):
        qg_car_index = 0
        nickname = 'mobile_user'
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
        raise tornado.gen.Return(user)
        # clear_all_cookie(self)
        # self.set_secure_cookie("user", str(user.id))