# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point


class Map(object):
    def __init__(self, tile_source_template, top_left, bottom_right, min_zoom, max_zoom):
        self.tile_source_template = tile_source_template
        self.top_left = top_left
        self.bottom_right = bottom_right
        self.min_zoom = min_zoom
        self.max_zoom = max_zoom

