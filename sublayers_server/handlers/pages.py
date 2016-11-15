# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

import tornado.web
import tornado.gen
from tornado.options import options  # todo: (!) use application.options


class PlayHandler(BaseHandler):
    def get(self):
        user = self.current_user
        if user:
            if user.is_quick_user and user.car_die:
                self.redirect('/#quick')
            else:
                self.render("play.html", ws_port=options.ws_port, map_link=options.map_link, server_mode=options.mode,
                            host_name=options.mobile_host, user_name=user.name, first_enter=True)
        else:
            self.redirect(self.get_login_url())


class MobilePlayHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        yield self._quick_registration()
        self.render("mobile/play.html", ws_port=options.ws_port, map_link=options.map_link, host_name=options.mobile_host)
