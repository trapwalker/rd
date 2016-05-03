# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

import tornado.web
from tornado.options import options  # todo: (!) use application.options


class PlayHandler(BaseHandler):
    def get(self):
        user = self.current_user
        if user:
            if user.is_quick_user and user.car_die:
                self.redirect('/#quick')
            else:
                self.render("play.html", ws_port=options.ws_port, map_link=options.map_link)
        else:
            self.redirect(self.get_login_url())
