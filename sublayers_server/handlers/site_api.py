# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import tornado
import tornado.web
import tornado.gen
import tornado.template

from sublayers_common.user_profile import User
from sublayers_common.handlers.base import BaseHandler
from sublayers_server.model.registry.classes.mobiles import Car as RegCar


class APIGetCarInfoHandler(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        username = self.get_argument('username', None)  # todo: send 404 error if username is empty ##refactor
        user = yield User.get_by_name(username)

        if not user:
            self.send_error(404)
            raise tornado.gen.Return()

        agent = self.application.srv.api.get_agent(user)  # todo: ##fix get offline (unloaded) agent
        if not agent:
            self.send_error(404)
            raise tornado.gen.Return()

        ex_car = agent.example.car
        if not ex_car:
            self.send_error(404)
            raise tornado.gen.Return()

        self.render('location/car_info_img_ext.html', car=ex_car)


class APIGetCarInfoHandler2(BaseHandler):
    def get(self):
        #uri = self.get_argument('uri', None)
        uri = 'reg:///registry/mobiles/cars/middle/sports/delorean_dmc12'  # todo: ##fix
        if not uri:
            self.send_error(404)
            return

        ex_car = None
        try:
            ex_car = self.application.srv.reg[uri]
        except:  # todo: catch specify exception ##refactor
            pass

        if not ex_car or not isinstance(ex_car, RegCar):  # todo: log warning if uri link is not car
            self.send_error(404)
            return
        self.render('location/car_info_img_ext_for_clear_web.html', car=ex_car)


class APIGetUserInfoHandler(BaseHandler):
    u"""Возвращает словарь с полями информации о пользователе и строку-шаблон с его машинкой"""
    @tornado.gen.coroutine
    def get(self):
        username = self.get_argument('username', None)  # todo: send 404 error if username is empty ##refactor
        user = yield User.get_by_name(username)

        if not user:
            self.send_error(404)
            raise tornado.gen.Return()

        user_info = dict(name=username)
        html_car_img = None
        name_car = None
        html_agent = None

        log.info('APIGetUserInfoHandler: %r', username)
        agent = None
        if user.quick:
            agent = self.application.srv.api.get_agent_quick_game(user)
        else:
            agent = self.application.srv.api.get_agent(user, make=True)
        # agent = self.application.srv.api.get_agent(user, make=True) # todo: убрать это, в будущем брать из User example
        if agent:
            user_info['driving'] = agent.example.driving.value
            user_info['shooting'] = agent.example.shooting.value
            user_info['masking'] = agent.example.masking.value
            user_info['engineering'] = agent.example.engineering.value
            user_info['trading'] = agent.example.trading.value
            user_info['leading'] = agent.example.leading.value
            user_info['about_self'] = agent.example.about_self  # Досье
            user_info['balance'] = agent.balance
            # todo: сделать пересылку правильных параметров
            user_info['lvl'] = '5'

            user_info['class'] = ''
            if agent.example.role_class:
                user_info['class'] = agent.example.role_class.description
            user_info['karma'] = '138'

            template_agent_info = tornado.template.Loader(
                    "templates/person",
                    namespace=self.get_template_namespace()
            ).load("person_site_info.html")
            html_agent = template_agent_info.generate(agent_example=agent.example, with_css=False, curr_user=user)

            user_info['position'] = None  # todo: У агента есть поле position - разобраться с ним
            ex_car = agent.example.car
            if ex_car:
                name_car = ex_car.name_car
                user_info['position'] = ex_car.position.as_tuple()

            template_img = tornado.template.Loader(
                "templates/site",
                namespace=self.get_template_namespace()
            ).load("car_info_ext_wrap.html")
            html_car_img = template_img.generate(car=ex_car)


        self.finish(dict(
            user_info=user_info,
            html_car_img=html_car_img,
            name_car=name_car,
            html_agent=html_agent
        ))


class APIGetUserInfoHandler2(BaseHandler):
    @tornado.gen.coroutine
    def get(self):
        username = self.get_argument('username', None)  # todo: send 404 error if username is empty ##refactor
        user = yield User.get_by_name(username)

        if not user:
            self.send_error(404)
            raise tornado.gen.Return()

        agent = self.application.srv.api.get_agent(user, make=True)
        if not agent:
            self.send_error(404)
            raise tornado.gen.Return()

        self.render('person/person_site_info.html', agent_example=agent.example, with_css=True)


class APIGetQuickGameCarsHandler(BaseHandler):
    def get(self):
        car_examples = self.application.srv.quick_game_cars_examples
        car_templates_list = []

        template_car = tornado.template.Loader(
            "templates/site",
            namespace=self.get_template_namespace()
        ).load("car_info_ext_wrap.html")

        for car_ex in car_examples:
            html_car_img = template_car.generate(car=car_ex)
            car_templates_list.append(html_car_img)
        self.finish({'quick_cars': car_templates_list})


class APIGetQuickGameCarsHandler2(BaseHandler):
    def get(self):
        car_examples = self.application.srv.quick_game_cars_examples
        self.render('site/quick_game_cars.html', car_examples=car_examples, with_css=True)
