# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web
from tornado.options import options

from sublayers_server.handlers.base import BaseHandler


class PlayHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        self.render("play.html", ws_port=options.ws_port, map_link=options.map_link)
