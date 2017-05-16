# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import glob
import os
import fnmatch

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
            's_agents_on': len(self.application.clients),
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


class ServerStatGraphicsHandler(BaseHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        from datetime import date, timedelta

        def daterange(start_date, end_date):
            for n in range(int((end_date - start_date).days)):
                yield start_date + timedelta(n)
            yield end_date

        file_list_all = fnmatch.filter(os.listdir(options.statistic_path), 'stat.csv.*')
        file_list = []

        event_file_list_all = fnmatch.filter(os.listdir(options.statistic_path), 'stat_events.csv.*')
        event_file_list = []

        today = date.today()

        start_date_arg = self.get_argument("start", None)
        start_date = today
        if start_date_arg:
            arr = start_date_arg.split("-")
            try:
                start_date = date(int(arr[0]), int(arr[1]), int(arr[2]))
            except:
                log.warning("Invalid date format %s", start_date_arg)

        end_date_arg = self.get_argument("end", None)
        end_date = today
        if end_date_arg:
            arr = end_date_arg.split("-")
            try:
                end_date = date(int(arr[0]), int(arr[1]), int(arr[2]))
            except:
                log.warning("Invalid date format %s", end_date_arg)

        last_days = self.get_argument("last_days", None)
        if last_days:
            try:
                last_days = int(last_days) - 1
                if last_days >= 0:
                    start_date = today - timedelta(days=last_days)
                    end_date = today
            except:
                log.warning("Invalid last_days format %s", last_days)

        for single_date in daterange(start_date, end_date):
            curr_date_str = single_date.strftime("%Y-%m-%d")
            for file_name in file_list_all:
                if file_name.find(curr_date_str) >= 0:
                    file_list.append(file_name)

            for file_name in event_file_list_all:
                if file_name.find(curr_date_str) >= 0:
                    event_file_list.append(file_name)

        if today == end_date:
            file_list.append("stat.csv")
            event_file_list.append("stat_events.csv")

        self.render("statistics/graphics_stats.html", file_list=file_list, event_file_list=event_file_list,
                    start_date=str(start_date), end_date=str(end_date))


class ServerStatEventGraphicsHandler(BaseHandler):
    def get(self):
        self.xsrf_token  # info: Вызывается, чтобы положить в куку xsrf_token - странно!
        from datetime import date, timedelta

        def daterange(start_date, end_date):
            for n in range(int((end_date - start_date).days)):
                yield start_date + timedelta(n)
            yield end_date

        file_list_all = fnmatch.filter(os.listdir(options.statistic_path), 'stat_events.csv.*')
        file_list = []
        today = date.today()

        start_date_arg = self.get_argument("start", None)
        start_date = today
        if start_date_arg:
            arr = start_date_arg.split("-")
            try:
                start_date = date(int(arr[0]), int(arr[1]), int(arr[2]))
            except:
                log.warning("Invalid date format %s", start_date_arg)

        end_date_arg = self.get_argument("end", None)
        end_date = today
        if end_date_arg:
            arr = end_date_arg.split("-")
            try:
                end_date = date(int(arr[0]), int(arr[1]), int(arr[2]))
            except:
                log.warning("Invalid date format %s", end_date_arg)

        last_days = self.get_argument("last_days", None)
        if last_days:
            try:
                last_days = int(last_days) - 1
                if last_days >= 0:
                    start_date = today - timedelta(days=last_days)
                    end_date = today
            except:
                log.warning("Invalid last_days format %s", last_days)

        for single_date in daterange(start_date, end_date):
            curr_date_str = single_date.strftime("%Y-%m-%d")
            for file_name in file_list_all:
                if file_name.find(curr_date_str) >= 0:
                    file_list.append(file_name)

        if today == end_date:
            file_list.append("stat_events.csv")

        self.render("statistics/event_graphics_stats.html", file_list=file_list, start_date=str(start_date),
                    end_date=str(end_date))

