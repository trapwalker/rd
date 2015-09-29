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

    def get_random_car_type(self):
        all_car_types = list(self.storage['reg://registry/mobiles/cars'])
        return random.choice(all_car_types)
