# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute, Position, Parameter, FloatAttribute, TextAttribute
from sublayers_server.model.registry.attr.link import Slot
from sublayers_server.model.registry.attr.inv import InventoryAttribute
from sublayers_server.model.registry.classes.weapons import Weapon  # todo: осторожно с рекуррентным импортом
from sublayers_server.model.registry.classes.item import SlotLock  # tpodo: перенести к описанию слота

from math import pi


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

    slot_FL = Slot(caption=u'ForwardLeftSlot', doc=u'Передний левый слот', tags='armorer')
    slot_FL_f = TextAttribute(default='FL', caption=u'Флаги переднего левого слота [FBLR]', tags='client slot_limit')
    slot_CL = Slot(caption=u'LeftSlot', doc=u'Центральный левый слот', tags='armorer')
    slot_CL_f = TextAttribute(default='FBL', caption=u'Флаги центрального левого слота [FBLR]', tags='client slot_limit')
    slot_BL = Slot(caption=u'BackwardLeftSlot', doc=u'Задний левый слот', tags='armorer')
    slot_BL_f = TextAttribute(default='BL', caption=u'Флаги залнего левого слота [FBLR]', tags='client slot_limit')

    slot_FC = Slot(caption=u'ForwardSlot', doc=u'Передний средний слот', tags='armorer')
    slot_FC_f = TextAttribute(default='FLR', caption=u'Флаги переднего среднего слота [FBLR]', tags='client slot_limit')
    slot_CC = Slot(caption=u'CentralSlot', doc=u'Центральный средний слот', tags='armorer')
    slot_CC_f = TextAttribute(default='FBLR', caption=u'Флаги центрального среднего слота [FBLR]', tags='client slot_limit')
    slot_BC = Slot(caption=u'BackwardSlot', doc=u'Задний средний слот', tags='armorer')
    slot_BC_f = TextAttribute(default='BLR', caption=u'Флаги заднего среднего слота [FBLR]', tags='client slot_limit')

    slot_FR = Slot(caption=u'ForwardRightSlot', doc=u'Передний правый слот', tags='armorer')
    slot_FR_f = TextAttribute(default='FR', caption=u'Флаги переднего правого слота [FBLR]', tags='client slot_limit')
    slot_CR = Slot(caption=u'RightSlot', doc=u'Центральный правый слот', tags='armorer')
    slot_CR_f = TextAttribute(default='FBR', caption=u'Флаги центрального правого слота [FBLR]', tags='client slot_limit')
    slot_BR = Slot(caption=u'BackwardRightSlot', doc=u'Задний правый слот', tags='armorer')
    slot_BR_f = TextAttribute(default='BR', caption=u'Флаги заднего правого слота [FBLR]', tags='client slot_limit')

    inventory = InventoryAttribute(caption=u'Инвентарь', doc=u'Список предметов в инвентаре ТС')
    inventory_size = Attribute(default=10, caption=u"Размер инвентаря")

    slot_m1 = Slot(caption=u'M1', doc=u'Слот механика 1', tags='mechanic')
    slot_m2 = Slot(caption=u'M1', doc=u'Слот механика 2', tags='mechanic')


    slot_t1 = Slot(caption=u't1', doc=u'Слот тюнера 1', tags='tuner')
    slot_t2 = Slot(caption=u't1', doc=u'Слот тюнера 2', tags='tuner')

    # todo: реализовать предынициализацию инвентаря абстрактным в конструкторе

    price = Attribute(default=0, caption=u"Цена")

    # Косметика
    title = Attribute(default="", caption=u"Модель автомобиля")
    class_car = Attribute(default="", caption=u"Класс автомобиля")
    name_car = Attribute(default="", caption=u"Название автомобиля")

    def iter_weapons(self):
        return (v for attr, v in self.iter_slots(tags='armorer') if isinstance(v, Weapon))

    def iter_slots(self, tags=None):
        for attr, getter in self.iter_attrs(tags=tags, classes=Slot):
            v = getter()
            if not isinstance(v, SlotLock) and v is not False:  # todo: SlotLock
                yield attr.name, v

    def get_count_slots(self, tags=None):
        result = 0
        for attr, getter in self.iter_attrs(tags=tags, classes=Slot):
            v = getter()
            if not isinstance(v, SlotLock) and v is not False:
                result += 1
        return result


class Car(Mobile):
    armorer_car_svg = Attribute(caption=u"Представление машинки у оружейника")
    tuner_car_svg = Attribute(caption=u"Представление машинки у тюнера")
    armorer_sectors_svg = Attribute(caption=u"Представление секторов машинки у оружейника")
    hangar_car = Attribute(caption=u"Представление машинки в ангаре")

    inv_icon_big = Attribute(caption=u'URL глифа (большой разиер) для блоков инвентарей')
    inv_icon_mid = Attribute(caption=u'URL глифа (средний размер) для блоков инвентарей')
    inv_icon_small = Attribute(caption=u'URL глифа (малый размер) для блоков инвентарей')


class Drone(Mobile):
    pass


class MapWeaponEffectMine(Mobile):
    effects = Attribute(default='', caption=u'Названия эффектов накладываемых миной через пробел')
