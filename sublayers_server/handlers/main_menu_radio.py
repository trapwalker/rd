# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler


class MenuRadioHandler(BaseHandler):
    def get(self):
        self.render("main_menu_radio_window.html")
