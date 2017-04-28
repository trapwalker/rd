# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_common.handlers.base import BaseHandler
from sublayers_server.model.registry_me.classes.agents import Agent

import tornado.web
import tornado.gen
from tornado.options import options
import tornado.template
from tornado.httpclient import AsyncHTTPClient
from bson.objectid import ObjectId, InvalidId
from functools import partial

from sublayers_site.site_locale import locale


class BaseSiteHandler(BaseHandler):
    @tornado.gen.coroutine
    def _get_car(self, user):
        user_info = dict(name=user.name)
        html_car_img = None
        name_car = None
        html_agent = None
         # todo: убрать un_cache, когда заработает reload
        agent_example = yield Agent.objects.get(profile_id=str(user._id), reload=True)
        if agent_example:
            agent_example.un_cache()
            agent_example = yield Agent.objects.get(profile_id=str(user._id), reload=True)
        else:
            # info: создание пустого агента для отображения на сайте
            agent_example = self.application.reg['agents/user'].instantiate(
                name=str(user._id), login=user.name, fixtured=False, profile_id=str(user._id),
                abstract=False,
            )
            yield agent_example.load_references()
            yield agent_example.save(upsert=True)
            role_class_ex = self.application.reg['rpg_settings/role_class/chosen_one']
            agent_example.role_class = role_class_ex

            for class_skill in role_class_ex.class_skills:
                # todo: Перебирать объекты реестра
                if class_skill.target in ['driving', 'shooting', 'masking', 'leading', 'trading', 'engineering']:
                    skill = getattr(agent_example, class_skill.target)
                    skill.mod = class_skill

            yield agent_example.save(upsert=True)

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
            user_info['class'] = '' if agent_example.role_class is None else agent_example.role_class.description

            # todo: научиться получать эти параметры
            user_info['lvl'] = agent_example.get_lvl()
            user_info['karma'] = agent_example.karma_name(lang=self.user_lang)
            # Не формировать темплейт пользователя, пока не установлен ролевой класс
            if agent_example.role_class:
                template_agent_info = tornado.template.Loader(
                    "../sublayers_server/templates/person",
                    namespace=self.get_template_namespace()
                ).load("person_site_info.html")
                html_agent = template_agent_info.generate(agent_example=agent_example, with_css=False, curr_user=user,
                                                          user_lang=self.user_lang)

            user_info['position'] = None  # todo: У агента есть поле position - разобраться с ним
            ex_car = agent_example.car
            if ex_car:
                user_info['position'] = ex_car.position.as_point().as_tuple()

            template_img = tornado.template.Loader(
                "../sublayers_server/templates/site",
                namespace=self.get_template_namespace()
            ).load("car_info_ext_wrap.html")
            html_car_img = template_img.generate(car=ex_car)

        raise tornado.gen.Return(dict(
            user_info=user_info,
            html_car_img=html_car_img,
            name_car=None if ex_car is None else ex_car.name_car,
            html_agent=html_agent
        ))

    def _get_quick_game(self):
        car_templates_list = []

        template_car = tornado.template.Loader(
            "../sublayers_server/templates/site",
            namespace=self.get_template_namespace()
        ).load("car_info_ext_wrap.html")

        for car_proto in self.application.reg['world_settings'].quick_game_cars:
            html_car_img = template_car.generate(car=car_proto)
            car_templates_list.append(html_car_img)
        return dict(quick_cars=car_templates_list)

    def get_template_namespace(self):
        namespace = super(BaseSiteHandler, self).get_template_namespace()
        namespace.update(
            _=partial(locale, self.user_lang)
        )
        return namespace

    @tornado.gen.coroutine
    def prepare(self):
        yield super(BaseSiteHandler, self).prepare()
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