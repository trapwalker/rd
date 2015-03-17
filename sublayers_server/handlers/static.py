# -*- coding: UTF-8 -*-
import logging
log = logging.getLogger(__name__)

from tornado.web import StaticFileHandler


class StaticFileHandlerPub(StaticFileHandler):
    def set_extra_headers(self, path):
        super(StaticFileHandlerPub, self).set_extra_headers(path)
        self.set_header("Access-Control-Allow-Origin", "*")
