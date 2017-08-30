# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler
from sublayers_server.model.vectors import Point
from sublayers_server.model.registry_me.tree import Position

import tornado.web
import tornado.gen

from tornado.options import options
from collections import Counter
from time import time as get_time


def frequency_handler_calling_limiter_deco(key=lambda *av, **kw: None):
    from functools import wraps
    def deco(method):
        @wraps(method)
        def closure(self, *av, **kw):
            return method(self, *av, **kw)

        return closure

    return deco


class PlayHandler(BaseHandler):
    _frequency_stat = {}

    def _frequency_delay(self, user_id):
        delay_to_forget = 90
        max_call_count_to_sleep = 7 #10

        frequency_stat = self._frequency_stat
        stat = frequency_stat.setdefault((self.__class__.__name__, 'get', user_id), Counter())
        t = get_time()
        last = stat['last']
        delta = t - last
        stat['last'] = t
        if delta > delay_to_forget:
            log.debug('== Reset handler call status by user %r', user_id)
            stat['count'] = 1
            stat['sum'] = 0
        else:
            stat['count'] += 1
            stat['sum'] += delta
            _sum = stat['sum']
            cnt = stat['count']
            if cnt > max_call_count_to_sleep:
                time_to_sleep = 20
                log.warning(
                    'User by id %r is too frequency call handler: %s times in last %ss. Need to sleep %ss.',
                    user_id, cnt, _sum, time_to_sleep,
                )
                return time_to_sleep
            log.debug('== Frequently calling status by user %r: %r', user_id, stat)

    def initialize(self):
        super(PlayHandler, self).initialize()
        self._break_handler = False

    def on_connection_close(self):
        super(PlayHandler, self).on_connection_close()
        log.debug('== User %r is closed connection.', self.get_secure_cookie("user"))
        self._break_handler = True

    def prepare(self):
        super(PlayHandler, self).prepare()

        user_lang = self.get_cookie('lang', None)
        # если cookie с языком не задана, то смотреть на host
        if user_lang is None:
            host = self.request.host
            # todo: ##REFACTORING host name
            if host == 'roaddogs.online':
                user_lang = 'en'
            elif host == 'roaddogs.ru':
                user_lang = 'ru'
            else:
                user_lang = 'en'

        if self.current_user:
            if self.current_user.lang != user_lang:
                self.current_user.lang = user_lang
                self.current_user.save()
            self.user_lang = user_lang


    @tornado.gen.coroutine
    def get(self):
        user_id = self.get_secure_cookie("user")
        if not user_id:
            self.redirect(self.get_login_url())
            return

        _time_to_sleep = self._frequency_delay(user_id)
        if _time_to_sleep:
            yield tornado.gen.sleep(_time_to_sleep)
            log.debug(
                'Ok. User %r is waked up after %ss %s',
                user_id,
                _time_to_sleep,
                'but connection already closed' if self._break_handler else '',
            )
            if self._break_handler:
                raise tornado.web.HTTPError(417)

        user = self.current_user
        # todo: ##REFACTORING
        if user is None:
            self.redirect(self.get_login_url())
            return

        if options.mode == 'basic':
            coord = None
            agent = self.application.srv.api.get_agent(user=user, make=True, do_disconnect=False)
            if not agent:
                self.redirect(self.get_login_url())
                return
            time = self.application.srv.get_time()
            connection_delay = 0 #agent.get_connection_delay(time=time)
            # if connection_delay is None:
            #     self.redirect('/static/connection_trouble.html')
            #     return

            coord = agent.get_loading_coord(time=time)

            # todo: убрать все что касается is_tester
            if not user.quick and not user.is_tester and user.registration_status == 'register':
                first_enter = user.teaching_state == ""  # Значит он не отвечал на вопрос про обучение
                if user.teaching_state != "map" and user.teaching_state != "map_start":
                    self.render(
                        "play.html",
                        ws_port=options.ws_port,
                        map_link=options.map_link,
                        server_mode=options.mode,
                        host_name=options.mobile_host,
                        user_name=user.name,
                        user_lang=self.user_lang,
                        first_enter=first_enter,
                        start_coord=coord,
                        insurance_name=agent.example.profile.insurance.title,
                        user_balance=agent.balance,
                        connection_delay=connection_delay,
                    )
                else:
                    log.warning('{} with teaching_state = {} try to connect on main server'.format(user, user.teaching_state))
                    self.redirect('/quick/play')
            else:
                self.redirect(self.get_login_url())

        if options.mode == 'quick':
            if not user.quick and user.teaching_state != "map" and user.teaching_state != "map_start":
                log.warning('{} with teaching_state = {} try to connect on quick server'.format(user, user.teaching_state))
                self.redirect('/play')
                return

            if not user.quick and user.teaching_state == "map_start":
                # Значит уже была попытка начать квест обучения, но его не закончили. попробовать найти агента, и если его нет, то вернуться на /play
                agent = self.application.srv.agents.get(str(user.pk), None)
                if not agent:
                    log.warning('{} with teaching_state = {} try to connect on quick server'.format(user, user.teaching_state))
                    self.redirect('/play')
                    return

            coord = None
            agent = self.application.srv.agents.get(str(user.pk), None)
            if agent and agent.car:
                coord = agent.car.position(time=self.application.srv.get_time())
            else:
                coord = Point.random_point(self.application.srv.quick_game_respawn_bots_radius, self.application.srv.quick_game_start_pos)

            user.start_position = Position(coord.x, coord.y)
            user.save()

            connection_delay = 0
            if agent:
                connection_delay = agent and agent.get_connection_delay(time=self.application.srv.get_time())
                if connection_delay is None:
                    self.redirect('/static/connection_trouble.html')
                    return

            self.render(
                "play.html",
                ws_port=options.ws_port,
                map_link=options.map_link,
                server_mode=options.mode,
                host_name=options.mobile_host,
                user_name=user.name,
                user_lang=self.user_lang,
                first_enter=False,
                start_coord=coord,
                insurance_name='quick',
                user_balance=0,
                connection_delay=connection_delay,
            )


class MobilePlayHandler(BaseHandler):
    def get(self):
        self._quick_registration()
        options = self.application.options
        self.render("mobile/play.html", ws_port=options.ws_port, map_link=options.map_link, host_name=options.mobile_host)
