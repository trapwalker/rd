# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

import tornado.gen

from sublayers_common.handlers.base import BaseHandler


class MenuSettingsHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        self.render("menu/settings_window.html")
