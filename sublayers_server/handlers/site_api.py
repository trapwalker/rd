# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado
import tornado.template

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


class APIGetUserInfoHandler(BaseHandler):
    u'''Возвращает словарь с полями информации о пользователе и строку-шаблон с его машинкой'''
    def get(self):
        username = self.get_argument('username', None)
        user = User.get_by_name(self.db, username)

        if not user:
            self.send_error(404)
            return
        user_info = dict(name=username)
        html_car_img = None
        name_car = None
        html_agent = None

        agent = self.application.srv.api.get_agent(user, make=True) # todo: убрать это, в будущем брать из User example
        if agent:
            user_info['driving'] = agent.example.driving
            user_info['shooting'] = agent.example.shooting
            user_info['masking'] = agent.example.masking
            user_info['engineering'] = agent.example.engineering
            user_info['trading'] = agent.example.trading
            user_info['leading'] = agent.example.leading
            user_info['about_self'] = agent.example.about_self  # Досье
            user_info['balance'] = agent.example.balance
            # todo: сделать пересылку правильных параметров
            user_info['lvl'] = '5'
            user_info['class'] = u'Избранный'
            user_info['karma'] = '138'

            template_agent_info = tornado.template.Loader(
                    "templates/person",
                    namespace=self.get_template_namespace()
            ).load("person_site_info.html")
            html_agent = template_agent_info.generate(agent_example=agent.example, with_css=False)

            user_info['position'] = None  # todo: У агента есть поле position - разобраться с ним
            ex_car = agent.example.car
            if ex_car:
                template_img = tornado.template.Loader(
                    "templates/location",
                    namespace=self.get_template_namespace()
                ).load("car_info_img_ext.html")
                html_car_img = template_img.generate(car=ex_car)
                name_car = ex_car.name_car
                user_info['position'] = ex_car.position.as_tuple()

        self.finish(dict(
            user_info=user_info,
            html_car_img=html_car_img,
            name_car=name_car,
            html_agent=html_agent
        ))


class APIGetUserInfoHandler2(BaseHandler):
    def get(self):
        username = self.get_argument('username', None)
        user = User.get_by_name(self.db, username)
        if not user:
            self.send_error(404)
            return
        agent = self.application.srv.api.get_agent(user, make=True)
        if not agent:
            self.send_error(404)
            return
        self.render('person/person_site_info.html', agent_example=agent.example, with_css=True)

