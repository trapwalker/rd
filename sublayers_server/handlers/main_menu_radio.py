# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

import tornado.gen

from sublayers_common.handlers.base import BaseHandler


class MenuRadioHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        self.render("main_menu_radio_window.html")
