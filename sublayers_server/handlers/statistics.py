# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web

from sublayers_common.handlers.base import BaseHandler
from tornado.options import options
from sublayers_server.model.agents import AI
from sublayers_server.model.messages import Message
from sublayers_server.model.events import Event


class ServerStatisticsHandler(BaseHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!

        server_stat = self.application.srv.get_server_stat()
        quick_game_bot_info = []
        if options.mode == 'quick':
            for agent in self.application.srv.agents.values():
                if isinstance(agent, AI):
                    quick_game_bot_info.append(agent)

        self.render("statistics/module_entry_server_stats.html", server_stat=server_stat, quick_game_bot_info=quick_game_bot_info)

    def post(self):
        action = self.get_argument('action', None)
        if action == 'bot_change':
            bot_name = self.get_argument('bot_name', "")
            ai_bot = self.application.srv.agents_by_name.get(bot_name, None)
            if not ai_bot:
                self.send_error(status_code=504)
                return
            ai_bot.worked = not ai_bot.worked
            log.info('Change worked flag for agent<{}>'.format(ai_bot))
            self.finish('ok')
            return
        if action == 'bot_refresh':
            self.finish(self.application.srv.get_server_stat())
            return


class ServerStatForSite(BaseHandler):
    def get(self):
        # todo: use cachetools or something else
        stat_log = self.application.srv.stat_log
        self.set_header("Access-Control-Allow-Origin", "*")
        self.finish({
            's_agents_on': stat_log.get_metric('s_agents_on'),
            's_observers_on': stat_log.get_metric('s_observers_on')
        })


class ServerStatMessagesHandler(BaseHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        self.render("statistics/messages_stats.html", messages_metrics=Message.messages_metrics)


class ServerStatEventsHandler(BaseHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        events_metrics = sorted(Event.events_metrics.values(), key=lambda rec: rec["count"], reverse=True)
        self.render("statistics/events_stats.html", events_metrics=events_metrics)


class ServerStatHandlersHandler(BaseHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        handlers_metrics = sorted(BaseHandler.handlers_metrics.values(), key=lambda rec: rec["count"], reverse=True)
        self.render("statistics/handlers_stats.html", handlers_metrics=handlers_metrics)
