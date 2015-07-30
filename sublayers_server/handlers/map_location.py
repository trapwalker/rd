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
        if location:
            svg_link = os.path.join(os.getcwd(), location.svg_link)
            if isinstance(location, Town):

                # todo: заьрать id из реестра
                car = {
                    "uid": 0
                }
                car_svg_link = os.path.join(os.getcwd(), 'static/img/cars/car_1/car.svg')
                sector_svg_link = os.path.join(os.getcwd(), 'static/img/cars/car_1/sector.svg')
                car_slots = ['slot_bl', 'slot_br', 'slot_cc', 'slot_fc']

                self.render("town.html", town=location, svg_link=svg_link, car_svg_link=car_svg_link,
                            sector_svg_link=sector_svg_link, car_slots=car_slots, car=car)
            elif isinstance(location, GasStation):
                self.render("gas_station.html", station=location, svg_link=svg_link)
            else:
                log.warn('Unknown type location: %s', location)
        else:
            log.warn('Location not found id: %s', location_id)
