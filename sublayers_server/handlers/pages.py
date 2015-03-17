# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web

from .base import BaseHandler


class MainHandler(BaseHandler):
    def get(self):
        self.render("index.html")
