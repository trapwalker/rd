# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web

from sublayers_common.handlers.base import BaseHandler
from tornado.options import options
from sublayers_server.model.agents import AI


class ServerStatisticsHandler(BaseHandler):
    def get(self):
        server_stat = self.application.srv.get_server_stat()
        quick_game_bot_info = []
        if options.mode == 'quick':
            for agent in self.application.srv.agents.values():
                if isinstance(agent, AI):
                    quick_game_bot_info.append(agent)

        self.render("module_entry_server_stats.html", server_stat=server_stat, quick_game_bot_info=quick_game_bot_info)


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
