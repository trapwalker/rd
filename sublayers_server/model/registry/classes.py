# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.attr import Attribute, RegistryLink, Slot


class Item(Root):
    icon = Attribute(caption=u'Пиктограмма предмета')
    stack_size = Attribute(default=1, caption=u'Максимальный размер стека этих предметов в инвентаре')
    base_price = Attribute(caption=u'Базовая цена за 1')


class SlotItem(Item):
    pass


class SlotLock(SlotItem):
    pass


class Weapon(SlotItem):
    ammo = RegistryLink(caption=u'Боеприпас')  # todo: store set of ammo types
    ammo_start_speed = Attribute(default=500, caption=u'Начальная скорость снаряда (м/с)')
    effective_rabge = Attribute(default=1000, caption=u'Прицельная дальность (м)')


class Cannon(Weapon):
    ammo_per_shot = Attribute(default=1, caption=u'Расход патронов на выстрел')


class MachineGun(Weapon):
    ammo_per_second = Attribute(default=1, caption=u'Расход патронов в секунду')


class Agent(Root):
    login = Attribute(caption=u'Уникальное имя пользователя')
    # todo: current car
    # todo: car list
    # todo: current location link

    # todo: party link
    # todo: invites list
    # todo: chats list?


class Mobile(Root):
    max_speed = Attribute(caption=u'V_max', doc=u'Максимальная скорость')

    slot_FL = Slot(caption=u'ForwardLeftSlot', doc=u'Передний левый слот')
    slot_CL = Slot(caption=u'LeftSlot', doc=u'Центральный левый слот')
    slot_BL = Slot(caption=u'BackwardLeftSlot', doc=u'Задний левый слот')

    slot_FC = Slot(caption=u'ForwardSlot', doc=u'Передний средний слот')
    slot_CC = Slot(caption=u'CentralSlot', doc=u'Центральный средний слот')
    slot_BC = Slot(caption=u'BackwardSlot', doc=u'Задний средний слот')

    slot_FR = Slot(caption=u'ForwardRightSlot', doc=u'Передний правый слот')
    slot_CR = Slot(caption=u'RightSlot', doc=u'Центральный правый слот')
    slot_BR = Slot(caption=u'BackwardRightSlot', doc=u'Задний правый слот')


class Car(Mobile):
    pass


class Drone(Mobile):
    pass


if __name__ == '__main__':
    pass
