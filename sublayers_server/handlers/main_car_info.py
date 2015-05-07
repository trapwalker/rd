# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler

class MainCarInfoHandler(BaseHandler):
    def get(self):
        self.render("main_car_info_window.html", data=dict(login='vasya', car_id='5'))