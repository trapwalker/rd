# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler

import tornado.web
import os


class TownHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        town_id = self.get_argument('town_id')
        town = self.application.srv.objects.get(int(town_id))
        if town:
            svg_link = os.path.join(os.getcwd(), town.svg_link)
            self.render("town.html", town=town, svg_link=svg_link, car_id=agent.api.car.uid)
        else:
            log.warn('Town not FOUND id: %s', town_id)
