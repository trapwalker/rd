# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web

from .base import BaseHandler


class ServerStatisticsHandler(BaseHandler):
    def get(self):
        server_stat = self.application.srv.get_server_stat()
        self.render("module_entry_server_stats.html", server_stat=server_stat)


class ServerStatisticsRefreshHandler(BaseHandler):
    def get(self):
        self.write(self.application.srv.get_server_stat())


class ServerStatForSite(BaseHandler):
    def get(self):
        # todo: use cachetools or something else
        stat_log = self.application.srv.stat_log
        self.set_header("Access-Control-Allow-Origin", "*")
        self.finish({
            's_agents_on': stat_log.get_metric('s_agents_on'),
            's_units_on': stat_log.get_metric('s_units_on')
        })
