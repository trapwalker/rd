# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_common.handlers.base import BaseHandler
from sublayers_common.creater_agent import create_agent

import tornado.template
#from tornado.httpclient import AsyncHTTPClient
from functools import partial



class BaseSiteHandler(BaseHandler):
    def _get_car(self, user):
        user_info = dict(name=user.name)
        html_car_img = None
        name_car = None
        html_agent = None
        # todo: Убедиться, что агент не берется из кеша, а грузится из базы заново
        agent_example = Agent.objects.filter(user_id=str(user.pk), quick_flag=False).first()
        if not agent_example:
            # info: создание пустого агента для отображения на сайте
            agent_example = create_agent(registry=self.application.reg, user=user)

        ex_car = None
        if agent_example:
            user_info['driving']     = agent_example.profile.driving.value
            user_info['shooting']    = agent_example.profile.shooting.value
            user_info['masking']     = agent_example.profile.masking.value
            user_info['engineering'] = agent_example.profile.engineering.value
            user_info['trading']     = agent_example.profile.trading.value
            user_info['leading']     = agent_example.profile.leading.value
            user_info['about_self']  = agent_example.profile.about_self  # Досье
            user_info['balance']     = agent_example.profile.balance
            user_info['class'] = '' if agent_example.profile.role_class is None else agent_example.profile.role_class.description

            # todo: научиться получать эти параметры
            user_info['lvl'] = agent_example.profile.get_lvl()
            user_info['karma'] = agent_example.profile.karma_name(lang=self.user_lang)
            # Не формировать темплейт пользователя, пока не установлен ролевой класс
            if agent_example.profile.role_class:
                template_agent_info = tornado.template.Loader(
                    "../sublayers_server/templates/person",
                    namespace=self.get_template_namespace()
                ).load("person_site_info.html")
                html_agent = template_agent_info.generate(
                    agent_example=agent_example,
                    with_css=False,
                    curr_user=user,
                    user_lang=self.user_lang,
                )

            user_info['position'] = None  # todo: У агента есть поле position - разобраться с ним
            ex_car = agent_example.profile.car
            if ex_car:
                user_info['position'] = ex_car.position.as_point().as_tuple()
            try:
                user_info['insurance_name'] = agent_example.profile.insurance.title
                user_info['active_quests_count'] = len(agent_example.profile.quests_active or [])
            except:
                pass

            template_img = tornado.template.Loader(
                "../sublayers_server/templates/site",
                namespace=self.get_template_namespace()
            ).load("car_info_ext_wrap.html")
            html_car_img = template_img.generate(car=ex_car)

        return dict(
            user_info=user_info,
            html_car_img=html_car_img,
            name_car=None if ex_car is None else ex_car.name_car,
            html_agent=html_agent,
        )

    def _get_quick_game(self):
        car_templates_list = []
        # todo: Extract path to settings
        template_car = tornado.template.Loader(
            "../sublayers_server/templates/site",
            namespace=self.get_template_namespace()
        ).load("car_info_ext_wrap.html")

        for car_proto in self.application.reg.get('/registry/world_settings').quick_game_cars:
            html_car_img = template_car.generate(car=car_proto)
            car_templates_list.append(html_car_img)
        return dict(quick_cars=car_templates_list)
