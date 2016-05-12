# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler

import tornado.web
import tornado.gen
from tornado.options import options
import tornado.template
from tornado.httpclient import AsyncHTTPClient
from bson.objectid import ObjectId, InvalidId
import json




class BaseSiteHandler(BaseHandler):
    def _get_car(self, user):
        user_info = dict(name=user.name)
        html_car_img = None
        name_car = None
        html_agent = None

        agent_example = self.application.reg_agents.get([str(user._id)])
        ex_car = None
        if agent_example:
            user_info['driving'] = agent_example.driving.value
            user_info['shooting'] = agent_example.shooting.value
            user_info['masking'] = agent_example.masking.value
            user_info['engineering'] = agent_example.engineering.value
            user_info['trading'] = agent_example.trading.value
            user_info['leading'] = agent_example.leading.value
            user_info['about_self'] = agent_example.about_self  # Досье
            user_info['balance'] = agent_example.balance
            user_info['class'] = agent_example.role_class.description

            # todo: научиться получать эти параметры
            user_info['lvl'] = '0'
            user_info['karma'] = '0'

            # template_agent_info = tornado.template.Loader(
            #     "templates/person",
            #     namespace=self.get_template_namespace()
            # ).load("person_site_info.html")

            # html_agent = template_agent_info.generate(agent_example=agent_example, with_css=False, curr_user=user)

            user_info['position'] = None  # todo: У агента есть поле position - разобраться с ним
            ex_car = agent_example.car
            if ex_car:
                user_info['position'] = ex_car.position.as_tuple()

            # template_img = tornado.template.Loader(
            #     "templates/site",
            #     namespace=self.get_template_namespace()
            # ).load("car_info_ext_wrap.html")
            # html_car_img = template_img.generate(car=ex_car)

        return dict(
            user_info=user_info,
            html_car_img=html_car_img,
            name_car=None if ex_car is None else ex_car.name_car,
            html_agent=html_agent
        )

    @tornado.gen.coroutine
    def _get_quick_game(self):
        car_examples = self.application.quick_game_cars_examples
        car_templates_list = []

        # template_car = tornado.template.Loader(
        #     "../sublayers_server/templates/site",
        #     namespace=self.get_template_namespace()
        # ).load("car_info_ext_wrap.html")
        #
        # for car_ex in car_examples:
        #     html_car_img = template_car.generate(car=car_ex)
        #     car_templates_list.append(html_car_img)
        return dict(quick_cars=car_templates_list)
