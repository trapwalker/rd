# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web
from tornado.options import options

from sublayers_common.handlers.base import BaseHandler


class TestInterlacingHandler(BaseHandler):
    def get(self):
        brightness = self.get_argument('brightness', '70')
        if not (0 <= int(brightness) <= 100):
            brightness = '70'
        self.render("test_interlacing.html", brightness=brightness)
