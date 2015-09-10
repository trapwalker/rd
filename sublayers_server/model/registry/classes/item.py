# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute, FloatAttribute, TextAttribute
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.transaction_events import (
    TransactionActivateTank, TransactionActivateAmmoBullets,
    TransactionActivateMine, TransactionActivateRebuildSet,
)


class Item(Root):
    icon = Attribute(caption=u'Пиктограмма предмета')
    # todo: обсудить диапазон
    amount = FloatAttribute(default=1, caption=u'Количество', doc=u'Реальное кличество предметов в стеке')
    stack_size = FloatAttribute(default=1, caption=u'Максимальный размер стека этих предметов в инвентаре')
    position = Attribute(caption=u'Позиция в инвентаре')
    base_price = FloatAttribute(default=0, caption=u'Базовая цена за 1', tags='client')

    description = TextAttribute(caption=u'Расширенное описание предмета', tags='client')
    inv_icon_big = Attribute(caption=u'URL глифа (большой разиер) для блоков инвентарей', tags='client')
    inv_icon_mid = Attribute(caption=u'URL глифа (средний размер) для блоков инвентарей', tags='client')
    inv_icon_small = Attribute(caption=u'URL глифа (малый размер) для блоков инвентарей', tags='client')
    # todo: move title attr to the root
    title = TextAttribute(caption=u'Название предмета для отображения в инвентаре', tags='client')
    activate_type = Attribute(default='none', caption=u'Способ активации: none, self ...', tags='client')

    @classmethod
    def activate(cls):
        pass


class Tank(Item):
    value_fuel = FloatAttribute(caption=u'Объем канистры', tags='client')


class TankFull(Tank):
    @classmethod
    def activate(cls):
        return TransactionActivateTank


class BuildSet(Item):
    build_points = FloatAttribute(caption=u'Объем восстановления здоровья в единицах')

    @classmethod
    def activate(cls):
        return TransactionActivateRebuildSet


class AmmoBullets(Item):
    @classmethod
    def activate(cls):
        return TransactionActivateAmmoBullets


class TankEmpty(Tank):
    pass


class SlotItem(Item):
    pass


class SlotLock(SlotItem):
    pass


class MapWeaponItem(Item):
    generate_obj = RegistryLink(caption=u'Ссылка на объект генерации', need_to_instantiate=False)


class MapWeaponMineItem(MapWeaponItem):
    @classmethod
    def activate(cls):
        return TransactionActivateMine
