# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler
from sublayers_server.model.registry_me.classes.agents import Agent

import tornado.template
#from tornado.httpclient import AsyncHTTPClient
from functools import partial

from sublayers_site.site_locale import locale


class BaseSiteHandler(BaseHandler):
    def _get_car(self, user):
        user_info = dict(name=user.name)
        html_car_img = None
        name_car = None
        html_agent = None
        # todo: Убедиться, что агент не берется из кеша, а грузится из базы заново
        agent_example = Agent.objects.get(user_id=str(user.pk))
        if not agent_example:
            # info: создание пустого агента для отображения на сайте
            agent_example = Agent(
                login=user.name,
                user_id=str(user.pk),
                profile=dict(
                    parent='/registry/agents/user',
                    name=str(user.pk),
                    role_class='/registry/rpg_settings/role_class/chosen_one',  # todo: Убрать как наследуемый?
                ),
            )

            for class_skill in agent_example.profile.role_class.class_skills:
                # todo: Перебирать объекты реестра
                if class_skill.target in ['driving', 'shooting', 'masking', 'leading', 'trading', 'engineering']:
                    skill = getattr(agent_example.profile, class_skill.target)
                    skill.mod = class_skill

            agent_example.save()

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

    def get_template_namespace(self):
        namespace = super(BaseSiteHandler, self).get_template_namespace()
        namespace.update(
            _=partial(locale, self.user_lang)
        )
        return namespace

    def prepare(self):
        super(BaseSiteHandler, self).prepare()
        user_lang = self.get_cookie('lang', None)
        # если cookie с языком не задана, то смотреть на host
        if user_lang is None:
            host = self.request.host
            if host == 'roaddogs.online':
                user_lang = 'en'
            elif host == 'roaddogs.ru':
                user_lang = 'ru'
            else:
                user_lang = 'en'
        self.user_lang = user_lang
