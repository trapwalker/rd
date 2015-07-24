# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.attr import Attribute


class Item(Root):
    icon = Attribute(caption=u'Пиктограмма предмета')
    stack_size = Attribute(default=1, caption=u'Максимальный размер стека этих предметов в инвентаре')
    base_price = Attribute(caption=u'Базовая цена за 1')


class Agent(Root):
    login = Attribute(caption=u'Уникальное имя пользователя')
    # todo: current car
    # todo: car list
    # todo: current location link

    # todo: party link
    # todo: invites list
    # todo: chats list?


class Mobile(Root):
    pass


class Car(Mobile):
    pass


class Drone(Mobile):
    pass


if __name__ == '__main__':
    pass
