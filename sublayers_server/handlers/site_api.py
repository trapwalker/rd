# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado.web
from tornado.options import options

from sublayers_server.user_profile import User

from sublayers_server.handlers.base import BaseHandler
from sublayers_server.model.registry.classes.mobiles import Car as RegCar


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
        uri = self.get_argument('uri', None)
        uri = 'reg://registry/mobiles/cars/middle/sports/delorean_dmc12'
        if not uri:
            self.send_error(404)
            return
        ex_car = None
        try:
            ex_car = self.application.srv.reg[uri]
        except:
            ex_car = None
        if not ex_car or not isinstance(ex_car, RegCar):
            self.send_error(404)
            return
        self.render('location/car_info_img_ext_for_clear_web.html', car=ex_car)