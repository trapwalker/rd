# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from pprint import pprint as pp

#from sublayers_server.model.
from game_class import Container, BaseClass, StrAttr, NumAttr


class BaseThing(BaseClass):
    u"""Базовый класс всех игровых вещей"""
    name    = StrAttr('_Thing', caption=u'Имя', doc=u'Имя класса. Должно быть идентификатором.')
    caption = StrAttr('_Thing', caption=u'Название', doc=u'Человекопонятное название класса.')
    
    


class Item(BaseThing):
    u"""Базовый класс всех инвентарных предметов"""
    stack_size = NumAttr(1)


class Vehicle(BaseThing):
    u"""Базовый класс всех подвижных юнитов"""
