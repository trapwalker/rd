# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

import tornado.web
import tornado.gen
from tornado.options import options  # todo: (!) use application.options


class MobileHeaderHandler(BaseHandler):
    def get(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self.render("mobile/header.html", is_mobile=True)


class MobileContentHandler(BaseHandler):    
    def get(self):
        self.set_header("Access-Control-Allow-Origin", "*")
        self._quick_registration()
        self.render("mobile/content.html", ws_port=options.ws_port, map_link=options.map_link, host_name=options.mobile_host, is_mobile=True)
