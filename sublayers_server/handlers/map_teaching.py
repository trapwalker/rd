# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler


class MapTeachingHandler(BaseHandler):
    def get(self):
        window_name = self.get_argument('window_name', default='')
        if window_name == 'cruise_speed':
            self.render("map_teaching/cruise_speed.html")
        elif window_name == 'cruise_zone':
            self.render("map_teaching/cruise_zone.html")
        elif window_name == 'cruise_speed_control':
            self.render("map_teaching/cruise_speed_control.html")
        elif window_name == 'cruise_speed_btn':
            self.render("map_teaching/cruise_speed_btn.html")
        elif window_name == 'driving_control':
            self.render("map_teaching/driving_control.html")
        elif window_name == 'cruise_radial':
            self.render("map_teaching/cruise_radial.html")
        elif window_name == 'zoom_slider':
            self.render("map_teaching/zoom_slider.html")
        elif window_name == 'discharge_shooting':
            self.render("map_teaching/discharge_shooting.html")
        elif window_name == 'auto_shooting':
            self.render("map_teaching/auto_shooting.html")
        elif window_name == 'try_kill':
            self.render("map_teaching/try_kill.html")
        elif window_name == 'try_game':
            self.render("map_teaching/try_game.html")
        self.send_error(status_code=404)