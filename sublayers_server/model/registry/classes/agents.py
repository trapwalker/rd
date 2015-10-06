# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Position, FloatAttribute, TextAttribute
from sublayers_server.model.registry.attr.link import RegistryLink

import random


class Agent(Root):
    login = TextAttribute(caption=u'Уникальное имя пользователя')
    car = RegistryLink(caption=u"Активный автомобиль")  # todo: test to prefix path like: /mobile/cars/*
    last_car = RegistryLink(caption=u"Последний активный автомобиль")  # todo: test to prefix path like: /mobile/cars/*

    position = Position(caption=u"Последние координаты агента")
    balance = FloatAttribute(default=1000, caption=u"Количество литров на счете агента")  # todo: обсудить

    last_town = RegistryLink(caption=u"Последний посещенный город")
    current_location = RegistryLink(caption=u"Текущая локация")

    # todo: current car
    # todo: car list
    # todo: current location link

    # todo: party link
    # todo: invites list
    # todo: chats list?

    # Скилы
    driving = FloatAttribute(default=50, caption=u"Навык вождения", tags="skill")
    shooting = FloatAttribute(default=0, caption=u"Навык стрельбы", tags="skill")
    masking = FloatAttribute(default=0, caption=u"Навык маскировки", tags="skill")
    leading = FloatAttribute(default=0, caption=u"Навык лидерства", tags="skill")
    trading = FloatAttribute(default=0, caption=u"Навык торговли", tags="skill")
    engineering = FloatAttribute(default=0, caption=u"Навык инженеринга", tags="skill")

    def get_skill_point(self):
        pass

    def get_used_skill_point(self):
        val = 0
        for attr, getter in self.iter_attrs(tags='skill'):
            val += getter()
        return val

    def iter_skills(self):
        for attr, getter in self.iter_attrs(tags='skill'):
            yield attr.name, getter()
