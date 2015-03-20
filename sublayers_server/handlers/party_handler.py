# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler

class PartyHandler(BaseHandler):
    def get(self):
        log.debug("I'm here ------------------------------------------------------------------------------------------")
        self.render("party/create_window.html", window_caption='Создание группы')
        #self.render("index.html")