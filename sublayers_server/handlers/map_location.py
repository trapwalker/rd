# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler

from sublayers_server.model.town import Town, GasStation
import tornado.web
import os


class MapLocationHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warn('Agent not found in database')
            self.send_error(status_code=404)
            return
        location_id = self.get_argument('location_id')
        location = self.application.srv.objects.get(int(location_id))
        if isinstance(location, Town):
            svg_link = os.path.join(os.getcwd(), location.svg_link)
            self.render("town.html", town=location, svg_link=svg_link, car_id=agent.api.car.uid)
        elif isinstance(location, GasStation):
            pass
        else:
            log.warn('Location not found id: %s', location_id)
