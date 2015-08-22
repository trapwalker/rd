# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import (
    Attribute, Position, Parameter,
    FloatAttribute, TextAttribute,
)
from sublayers_server.model.registry.attr.inv import InventoryAttribute
from sublayers_server.model.registry.attr.tag import TagsAttribute
from sublayers_server.model.registry.attr.link import RegistryLink, Slot
from sublayers_server.model.registry.attr.price import PriceAttribute
from sublayers_server.model.transaction_events import TransactionActivateTank, TransactionActivateAmmoBullets

from math import pi
import random
from itertools import chain


class Item(Root):
    icon = Attribute(caption=u'Пиктограмма предмета')
    # todo: обсудить диапазон
    amount = FloatAttribute(default=1, caption=u'Количество', doc=u'Реальное кличество предметов в стеке')
    stack_size = FloatAttribute(default=1, caption=u'Максимальный размер стека этих предметов в инвентаре')
    position = Attribute(caption=u'Позиция в инвентаре')
    base_price = FloatAttribute(caption=u'Базовая цена за 1')

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
    pass

    @classmethod
    def activate(cls):
        return TransactionActivateTank


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


class Weapon(SlotItem):
    ammo = RegistryLink(caption=u'Боеприпас', need_to_instantiate=False)  # todo: store set of ammo types
    direction = TextAttribute(caption=u'Направление (FBRL)', tags='client')
    ammo_per_shot = FloatAttribute(default=0, caption=u'Расход патронов за выстрел (< 0)')
    ammo_per_second = FloatAttribute(default=0, caption=u'Расход патронов в секунду')
    radius = FloatAttribute(caption=u'Дальность стрельбы (м)')
    width = FloatAttribute(caption=u'Ширина сектора стрельбы (град)')

    armorer_side_F = Attribute(caption=u'Изображение у оружейника (вид сбоку, вперед)', tags='client')
    armorer_side_B = Attribute(caption=u'Изображение у оружейника (вид сбоку, назад)', tags='client')
    armorer_side_R = Attribute(caption=u'Изображение у оружейника (вид сбоку, право)', tags='client')
    armorer_side_L = Attribute(caption=u'Изображение у оружейника (вид сбоку, лево)', tags='client')
    armorer_top_F = Attribute(caption=u'Изображение у оружейника (вид сверху, вперед)', tags='client')
    armorer_top_B = Attribute(caption=u'Изображение у оружейника (вид сверху, назад)', tags='client')
    armorer_top_R = Attribute(caption=u'Изображение у оружейника (вид сверху, право)', tags='client')
    armorer_top_L = Attribute(caption=u'Изображение у оружейника (вид сверху, лево)', tags='client')


class Cannon(Weapon):
    is_auto = False
    dmg = FloatAttribute(caption=u'Урон за выстрел')
    time_recharge = FloatAttribute(caption=u'Время перезарядки (с)')


class MachineGun(Weapon):
    is_auto = True
    dps = FloatAttribute(caption=u'Урон в секунду')


class Agent(Root):
    login = TextAttribute(caption=u'Уникальное имя пользователя')
    car = RegistryLink(caption=u"Активный автомобиль")  # todo: test to prefix path like: /mobile/cars/*

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


class Mobile(Root):
    # атрибуты от PointObject
    position = Position(caption=u"Последние координаты объекта")

    # атрибуты от VisibleObjects
    p_visibility = Parameter(default=1, caption=u"Коэффициент заметности")

    # атрибуты от ObserverObjects
    p_observing_range = Parameter(default=1000, caption=u"Радиус обзора")

    # атрибуты от Unit
    p_defence = Parameter(default=1, caption=u"Броня")
    max_hp = FloatAttribute(caption=u"Максимальное значение HP")
    hp = FloatAttribute(caption=u"Текущее значение HP")
    direction = FloatAttribute(default=-pi/2, caption=u"Текущее направление машины")

    # атрибуты Mobile
    r_min = FloatAttribute(default=10, caption=u"Минимальный радиус разворота")
    ac_max = FloatAttribute(default=14, caption=u"Максимальная перегрузка при развороте")
    max_control_speed = FloatAttribute(default=28, caption=u"Абсолютная максимальная скорость движения")
    v_forward = FloatAttribute(default=20, caption=u"Максимальная скорость движения вперед")
    v_backward = FloatAttribute(default=-10, caption=u"Максимальная скорость движения назад")
    a_forward = FloatAttribute(default=5, caption=u"Ускорение разгона вперед")
    a_backward = FloatAttribute(default=-3, caption=u"Ускорение разгона назад")
    a_braking = FloatAttribute(default=-6, caption=u"Ускорение торможения")

    max_fuel = FloatAttribute(default=100, caption=u"Максимальное количество топлива")
    fuel = FloatAttribute(default=100, caption=u"Текущее количество топлива")
    p_fuel_rate = FloatAttribute(default=0.5, caption=u"Расход топлива (л/с)")

    slot_FL = Slot(caption=u'ForwardLeftSlot', doc=u'Передний левый слот')
    slot_FL_f = TextAttribute(default='FL', caption=u'Флаги переднего левого слота [FBLR]', tags='client slot_limit')
    slot_CL = Slot(caption=u'LeftSlot', doc=u'Центральный левый слот')
    slot_CL_f = TextAttribute(default='FBL', caption=u'Флаги центрального левого слота [FBLR]', tags='client slot_limit')
    slot_BL = Slot(caption=u'BackwardLeftSlot', doc=u'Задний левый слот')
    slot_BL_f = TextAttribute(default='BL', caption=u'Флаги залнего левого слота [FBLR]', tags='client slot_limit')

    slot_FC = Slot(caption=u'ForwardSlot', doc=u'Передний средний слот')
    slot_FC_f = TextAttribute(default='FLR', caption=u'Флаги переднего среднего слота [FBLR]', tags='client slot_limit')
    slot_CC = Slot(caption=u'CentralSlot', doc=u'Центральный средний слот')
    slot_CC_f = TextAttribute(default='FBLR', caption=u'Флаги центрального среднего слота [FBLR]', tags='client slot_limit')
    slot_BC = Slot(caption=u'BackwardSlot', doc=u'Задний средний слот')
    slot_BC_f = TextAttribute(default='BLR', caption=u'Флаги заднего среднего слота [FBLR]', tags='client slot_limit')

    slot_FR = Slot(caption=u'ForwardRightSlot', doc=u'Передний правый слот')
    slot_FR_f = TextAttribute(default='FR', caption=u'Флаги переднего правого слота [FBLR]', tags='client slot_limit')
    slot_CR = Slot(caption=u'RightSlot', doc=u'Центральный правый слот')
    slot_CR_f = TextAttribute(default='FBR', caption=u'Флаги центрального правого слота [FBLR]', tags='client slot_limit')
    slot_BR = Slot(caption=u'BackwardRightSlot', doc=u'Задний правый слот')
    slot_BR_f = TextAttribute(default='BR', caption=u'Флаги заднего правого слота [FBLR]', tags='client slot_limit')

    inventory = InventoryAttribute(caption=u'Инвентарь', doc=u'Список предметов в инвентаре ТС')
    inventory_size = Attribute(caption=u"размер инвентаря")
    # todo: реализовать предынициализацию инвентаря абстрактным в конструкторе

    price = Attribute(default=0, caption=u"Цена")

    # Косметика
    title = Attribute(caption=u"Название автомобиля")

    def iter_weapons(self):
        return (v for attr, v in self.iter_slots() if isinstance(v, Weapon))

    def iter_slots(self):
        for attr, getter in self.iter_attrs(classes=Slot):
            v = getter()
            if not isinstance(v, SlotLock) and not v is False:  # todo: SlotLock
                yield attr.name, v


class Car(Mobile):
    armorer_car_svg = Attribute(caption=u"Представление машинки у оружейника")
    armorer_sectors_svg = Attribute(caption=u"Представление секторов машинки у оружейника")


class Drone(Mobile):
    pass


class POI(Root):
    position = Position(caption=u"Координаты")
    p_visibility = Parameter(default=1, caption=u"Коэффициент заметности")


class PoiStash(POI):
    inventory = InventoryAttribute(caption=u'Инвентарь', doc=u'Список предметов в инвентаре сундука')
    inventory_size = Attribute(caption=u"размер инвентаря")


class RadioTower(POI):
    p_observing_range = Parameter(default=1000, caption=u"Радиус покрытия")


class MapLocation(POI):
    p_observing_range = Parameter(default=1000, caption=u"Радиус входа")
    svg_link = Attribute(caption=u"Фон локации")  # todo: Сделать специальный атрибут для ссылки на файл
    title = TextAttribute(caption=u"Название локации")


class GasStation(MapLocation):
    u"""Заправочная станция"""


class Town(MapLocation):
    armorer = RegistryLink(caption=u'Оружейник')
    trader = RegistryLink(caption=u'Торговец')
    hangar = RegistryLink(caption=u'Ангар')
    nucoil = RegistryLink(caption=u'Заправка')


class Institution(Root):
    title = TextAttribute(caption=u"Имя")
    photo = Attribute(caption=u"Фото")  # todo: Сделать специальный атрибут для ссылки на файл
    text = TextAttribute(caption=u"Текст приветствия")


class Nucoil(Institution):
    pass


class Armorer(Institution):
    pass


class Trader(Institution):
    inventory = InventoryAttribute(caption=u'Инвентарь', doc=u'Список предметов в инвентаре торговца')
    price = PriceAttribute(caption=u"Прайс")

    def as_client_dict(self, items=()):
        d = super(Trader, self).as_client_dict()
        d['price'] = self.price.get_pricelist(chain(items, self.inventory))
        return d


class Hangar(Institution):
    car_list = Attribute(caption=u"Список продаваемых машин")


if __name__ == '__main__':
    pass
