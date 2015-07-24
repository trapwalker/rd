# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.attr import Attribute, RegistryLink


class Item(Root):
    icon = Attribute(caption=u'Пиктограмма предмета')
    stack_size = Attribute(default=1, caption=u'Максимальный размер стека этих предметов в инвентаре')
    base_price = Attribute(caption=u'Базовая цена за 1')


class SlotItem(Item):
    pass


class SlotLock(SlotItem):
    pass


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

    slot_CC = RegistryLink(caption=u'CentralSlot', doc=u'Центральный слот')
    slot_FC = RegistryLink(caption=u'ForwardSlot', doc=u'Передний слот')
    slot_BC = RegistryLink(caption=u'BackwardSlot', doc=u'Задний слот')


class Car(Mobile):
    pass


class Drone(Mobile):
    pass


if __name__ == '__main__':
    pass
