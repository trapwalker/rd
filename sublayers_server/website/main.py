# -*- coding: UTF-8 -*-
import logging
log = logging.getLogger(__name__)

from tornado.web import RequestHandler


class MainHandler(RequestHandler):
    def get(self):
        self.render("index.html", messages=[])
