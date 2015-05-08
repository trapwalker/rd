# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web

from .base import BaseHandler


class MainHandler(BaseHandler):
    def get(self):
        car = None
        agent = self.application.srv.api.get_agent(self.current_user, make=False, do_disconnect=False)
        if agent:
            if agent.cars:
                if agent.cars[0]:
                    car = agent.cars[0]
        self.render("index.html", car=car)


class PlayHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
        self.render("play.html")