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
                # todo: убрать все что касается is_tester
                if not user.quick and not user.is_tester:
                    first_enter = user.teaching_state == ""  # Значит он не отвечал на вопрос про обучение
                    if user.teaching_state != "map":
                        self.render("play.html", ws_port=options.ws_port, map_link=options.map_link,
                                    server_mode=options.mode, host_name=options.mobile_host, user_name=user.name,
                                    first_enter=first_enter)
                    else:
                        log.warning('{} with teaching_state = {} try to connect on main server'.format(user, user.teaching_state))
                        self.redirect('/quick/play')
                else:
                    self.redirect(self.get_login_url())

            if options.mode == 'quick':
                if (not user.quick) and (user.teaching_state != "map"):
                    log.warning('{} with teaching_state = {} try to connect on quick server'.format(user, user.teaching_state))
                    self.redirect('/play')
                    return
                self.render("play.html", ws_port=options.ws_port, map_link=options.map_link,
                            server_mode=options.mode, host_name=options.mobile_host, user_name=user.name,
                            first_enter=False)
        else:
            self.redirect(self.get_login_url())


class MobilePlayHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        yield self._quick_registration()
        options = self.application.options
        self.render("mobile/play.html", ws_port=options.ws_port, map_link=options.map_link, host_name=options.mobile_host)
