# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web

from .base import BaseHandler


class ServerStatisticsHandler(BaseHandler):
    def get(self):
        server_stat = self.application.srv.stat_log.get_server_stat()
        self.render("module_entry_server_stats.html", server_stat=server_stat)


class ServerStatisticsRefreshHandler(BaseHandler):
    def get(self):
        self.write(self.application.srv.stat_log.get_server_stat())
