# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler

from sublayers_server.model.map_location import Town, GasStation
import tornado.web
import os


class MapLocationHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent is None:
            log.warning('Agent not found in database')
            self.send_error(status_code=404)
            return
        location_id = self.get_argument('location_id')
        location = self.application.srv.objects.get(int(location_id))
        if location:
            svg_link = os.path.join(os.getcwd(), location.example.svg_link)
            if isinstance(location, Town):
                car_ex = agent.example.car

                car_svg_link = None
                tuner_car_svg_link=None
                sector_svg_link = None
                armorer_slots = []
                mechanic_slots = []
                tuner_slots = []
                if car_ex:
                    mechanic_engine = os.path.join(os.getcwd(), car_ex.mechanic_engine)
                    armorer_link = os.path.join(os.getcwd(), car_ex.armorer_car)
                    tuner_link = os.path.join(os.getcwd(), car_ex.tuner_car)
                    sector_svg_link = os.path.join(os.getcwd(), car_ex.armorer_sectors_svg)

                    armorer_slots = [v[0] for v in car_ex.iter_slots(tags='armorer')]
                    mechanic_slots = [v[0] for v in car_ex.iter_slots(tags='mechanic')]
                    tuner_slots = [v[0] for v in car_ex.iter_slots(tags='tuner')]


                self.render("location/town.html", town=location, svg_link=svg_link, mechanic_engine=mechanic_engine,
                            armorer_link=armorer_link, tuner_link=tuner_link, sector_svg_link=sector_svg_link,
                            armorer_slots=armorer_slots, tuner_slots=tuner_slots,
                            mechanic_slots=mechanic_slots, agent=agent)
            elif isinstance(location, GasStation):
                self.render("location/gas_station.html", station=location, svg_link=svg_link, agent=agent)
            else:
                log.warn('Unknown type location: %s', location)
        else:
            log.warn('Location not found id: %s', location_id)
