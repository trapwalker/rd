# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from .base import BaseHandler

import tornado.web
import os


class GasStationHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        station_id = self.get_argument('station_id')
        station = self.application.srv.objects.get(int(station_id))
        if station:
            svg_link = os.path.join(os.getcwd(), 'static/img/gas_station/gas_station.svg')
            self.render("gas_station.html", station=station, svg_link=svg_link)
        else:
            log.warn('Gas-station not FOUND id: %s', station_id)