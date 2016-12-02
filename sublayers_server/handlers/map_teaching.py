# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler


class MapTeachingHandler(BaseHandler):

    def get(self):
        window_name = self.get_argument('window_name', default='')
        if window_name == 'cruise_speed':
            self.render("map_teaching/cruise_speed.html")
        self.send_error(status_code=404)