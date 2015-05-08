# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler


class TownHandler(BaseHandler):
    def get(self):
        self.render("town.html", town=1)