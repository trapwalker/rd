# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler


class MenuCharacterHandler(BaseHandler):
    def get(self):
        self.render("menu/character_window.html")