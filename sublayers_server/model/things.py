# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    import sys
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))


#from sublayers_server.model.
from game_class import Container, BaseClass, StrAttr, NumAttr


class BaseThing(BaseClass):
    u"""Базовый класс всех игровых вещей"""
    name    = StrAttr(default=lambda attr, obj, cls: cls.__name__, caption=u'Имя', doc=u'Имя класса. Должно быть идентификатором.')
    caption = StrAttr('_Thing', caption=u'Название', doc=u'Человекопонятное название класса.')
    
    
class Weapon(BaseThing):
    u"""Базовый класс оружия"""


class MachineGun(Weapon):
    u"""Автоматическое оружие"""
    dps = NumAttr(default=1, caption=u'DPS', doc=u'Урон в секунду')


class VolleyGun(Weapon):
    u"""Залповое оружие"""
    damage = NumAttr(default=10, caption=u'Урон', doc=u'Урон при стопроцентном попадании')


class Item(BaseThing):
    u"""Базовый класс всех инвентарных предметов"""
    stack_size = NumAttr(1)


class Vehicle(BaseThing):
    u"""Базовый класс всех подвижных юнитов"""
