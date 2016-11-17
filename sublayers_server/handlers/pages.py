# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

import tornado.web
import tornado.gen

from tornado.options import options


class PlayHandler(BaseHandler):
    def get(self):
        user = self.current_user
        if user:
            if options.mode == 'basic':
                if not user.quick:
                    first_enter = True  # todo: достать из агента, которого достать тут же
                    self.render("play.html", ws_port=options.ws_port, map_link=options.map_link,
                                server_mode=options.mode,
                                host_name=options.mobile_host, user_name=user.name, first_enter=first_enter)
                else:
                    self.redirect(self.get_login_url())

            if options.mode == 'quick':
                if not user.quick:
                    # todo: сделать проверку, чтобы пользователи с уже пройденным обучением не попадали на этот сервер
                    self.render("play.html", ws_port=options.ws_port, map_link=options.map_link,
                                server_mode=options.mode,
                                host_name=options.mobile_host, user_name=user.name, first_enter=True)
                else:
                    # todo: убрать понятие car_die и просто выдавать новую машинку
                    if not user.car_die:
                        self.render("play.html", ws_port=options.ws_port, map_link=options.map_link,
                                    server_mode=options.mode,
                                    host_name=options.mobile_host, user_name=user.name, first_enter=False)
                    else:
                        self.redirect('/#quick')
        else:
            self.redirect(self.get_login_url())


class MobilePlayHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        yield self._quick_registration()
        options = self.application.options
        self.render("mobile/play.html", ws_port=options.ws_port, map_link=options.map_link, host_name=options.mobile_host)
