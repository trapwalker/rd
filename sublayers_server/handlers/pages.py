# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web

from .base import BaseHandler

class PlayHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        self.render("play.html")