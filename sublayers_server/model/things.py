# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from pprint import pprint as pp

from sublayers_server.model.game_class import Attribute, Container, BaseClass


class BaseThing(BaseClass):
    u"""Базовый класс всех игровых вещей"""


class Item(BaseThing):
    u"""Базовый класс всех инвентарных предметов"""
    stack_size = Attribute(1)


class Vehicle(BaseThing):
    u"""Базовый класс всех подвижных юнитов"""
