# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler

import tornado.web

class TownHandler(BaseHandler):
    def get(self):
        self.render("town.html", town=1)

    @tornado.web.authenticated
    def post(self):
        town_id = self.get_argument('town_id')
        town = self.application.srv.objects.get(town_id)

        self.render("town.html", town=town)