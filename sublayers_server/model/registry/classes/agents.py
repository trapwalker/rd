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
    driving = FloatAttribute(default=0, caption=u"Навык вождения")
    shooting = FloatAttribute(default=0, caption=u"Навык стрельбы")
    masking = FloatAttribute(default=0, caption=u"Навык маскировки")
    leading = FloatAttribute(default=0, caption=u"Навык лидерства")
    trading = FloatAttribute(default=0, caption=u"Навык торговли")
    engineering = FloatAttribute(default=0, caption=u"Навык инженеринга")

    def get_skill_point(self):
        pass

    def get_used_skill_point(self):
        return self.driving + self.shooting + self.masking + self.leading + self.trading + self.engineering