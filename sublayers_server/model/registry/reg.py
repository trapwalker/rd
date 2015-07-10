# -*- coding: utf-8 -*-
__author__ = 'svp'

import logging
log = logging.getLogger(__name__)


from tree import Root, Registry
from attr import Attribute
from sugar import DeclareNodeMeta



reg = Registry()


class Item(Root):
    icon = Attribute(caption=u'Пиктограмма предмета')
    stack_size = Attribute(default=1, caption=u'Максимальный размер стека этих предметов в инвентаре')
    base_price = Attribute(caption=u'Базовая цена за 1')


class iCar(reg.Root, Item):
    base_price = 1000
