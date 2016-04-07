# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web
from tornado.options import options

from sublayers_server.user_profile import User

from sublayers_server.handlers.base import BaseHandler



class APIGetCarInfoHandler(BaseHandler):
    def get(self):
        username = self.get_argument('username', None)
        user = User.get_by_name(self.db, username)
        if not user:
            self.send_error(404)
            return
        agent = self.application.srv.api.get_agent(user)
        if not agent:
            self.send_error(404)
            return
        ex_car = agent.example.car
        if not ex_car:
            self.send_error(404)
            return
        self.render('location/car_info_img_ext.html', car=ex_car)


class APIGetCarInfoHandler2(BaseHandler):
    def get(self):
        username = self.get_argument('username', None)
        uri = self.get_argument('uri', None)
        if not username:
            self.send_error(404)
            return
        agent = self.application.srv.api.get_agent(username)
        if not agent:
            self.send_error(404)
            return
        ex_car = agent.example.car
        if not ex_car:
            self.send_error(404)
            return
        self.render('location/car_info_img_ext.html', car=ex_car)