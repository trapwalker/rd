# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web
from tornado.options import options

from sublayers_server.handlers.base import BaseHandler


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
