# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.attr import Attribute, RegistryLink, Slot, Position, Parameter, ClientAttribute

from math import pi, radians
import random


class Item(Root):
    icon = Attribute(caption=u'Пиктограмма предмета')
    stack_size = Attribute(default=1, caption=u'Максимальный размер стека этих предметов в инвентаре')
    base_price = Attribute(caption=u'Базовая цена за 1')

    description = Attribute(caption=u'Расширенное описание предмета', tags='client')
    inv_icon_big = Attribute(caption=u'Ссылка на картинку предмета для отображения в блоках инвентарей', tags='client')
    inv_icon_mid = Attribute(caption=u'Ссылка на картинку предмета для отображения в блоках инвентарей', tags='client')
    inv_icon_small = Attribute(caption=u'Ссылка на картинку предмета для отображения в блоках инвентарей', tags='client')
    # todo: move title attr to the root
    title = Attribute(caption=u'Название предмета для отображения в инвентаре', tags='client')

    def as_client_dict(self):
        # return {attr.name: getter() for attr, getter in self.iter_attrs(tags='client')}
        d = {}
        for attr, getter in self.iter_attrs(tags='client'):
            d[attr.name] = getter()
        return d


class SlotItem(Item):
    pass


class SlotLock(SlotItem):
    pass


class Weapon(SlotItem):
    ammo = RegistryLink(caption=u'Боеприпас', need_to_instantiate=False)  # todo: store set of ammo types
    ammo_start_speed = Attribute(default=500, caption=u'Начальная скорость снаряда (м/с)')
    effective_range = Attribute(default=1000, caption=u'Прицельная дальность (м)')
    direction = Attribute(default=0, caption=u'Направление (град)')  # todo: Убрать default
    ammo_per_shot = Attribute(default=0, caption=u'Расход патронов за выстрел (< 0)')
    ammo_per_second = Attribute(default=0, caption=u'Расход патронов в секунду')
    radius = Attribute(caption=u'Прицельная дальность (м)')
    width = Attribute(caption=u'Ширина сектора стрельбы (град)')


class Cannon(Weapon):
    is_auto = False
    dmg = Attribute(caption=u'Урон за выстрел')
    time_recharge = Attribute(caption=u'Время перезарядки (с)')


class MachineGun(Weapon):
    is_auto = True
    dps = Attribute(caption=u'Урон в секунду')


class Agent(Root):
    login = Attribute(caption=u'Уникальное имя пользователя')
    car = RegistryLink(caption=u"Активный автомобиль")  # todo: test to prefix path like: /mobile/cars/*

    position = Position(caption=u"Последние координаты агента")
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
    max_hp = Attribute(caption=u"Максимальное значение HP")
    hp = Attribute(caption=u"Текущее значение HP")
    direction = Attribute(default=-pi/2, caption=u"Текущее направление машины")

    # атрибуты Mobile
    r_min = Attribute(default=10, caption=u"Минимальный радиус разворота")
    ac_max = Attribute(default=14, caption=u"Максимальная перегрузка при развороте")
    v_forward = Attribute(default=28, caption=u"Абсолютная максимальная скорость движения вперед")
    v_backward = Attribute(default=-10, caption=u"Максимальная скорость движения назад")
    a_forward = Attribute(default=5, caption=u"Ускорение разгона вперед")
    a_backward = Attribute(default=-3, caption=u"Ускорение разгона назад")
    a_braking = Attribute(default=-6, caption=u"Ускорение торможения")
    max_fuel = Attribute(default=100, caption=u"Максимальное количество топлива")
    fuel = Attribute(default=100, caption=u"Текущее количество топлива")
    p_cc = Parameter(default=1, caption=u"Броня")
    p_fuel_rate = Parameter(default=0.5, caption=u"Расход топлива (л/с)")
    max_control_speed = Attribute(default=20, caption=u"Максимальная скорость машинки без бафов")

    slot_FL = Slot(caption=u'ForwardLeftSlot', doc=u'Передний левый слот')
    slot_CL = Slot(caption=u'LeftSlot', doc=u'Центральный левый слот')
    slot_BL = Slot(caption=u'BackwardLeftSlot', doc=u'Задний левый слот')

    slot_FC = Slot(caption=u'ForwardSlot', doc=u'Передний средний слот')
    slot_CC = Slot(caption=u'CentralSlot', doc=u'Центральный средний слот')
    slot_BC = Slot(caption=u'BackwardSlot', doc=u'Задний средний слот')

    slot_FR = Slot(caption=u'ForwardRightSlot', doc=u'Передний правый слот')
    slot_CR = Slot(caption=u'RightSlot', doc=u'Центральный правый слот')
    slot_BR = Slot(caption=u'BackwardRightSlot', doc=u'Задний правый слот')

    def iter_weapons(self):
        for attr in self.iter_attrs():
            if isinstance(attr, Slot):
                v = getattr(self, attr.name)
                if isinstance(v, Weapon):
                    yield v

    def iter_slots(self):
        for attr in self.iter_attrs():
            if isinstance(attr, Slot):
                v = getattr(self, attr.name)
                if not isinstance(v, SlotLock):
                    yield attr.name, v


class Car(Mobile):
    armorer_car_svg = Attribute(caption=u"Представление машинки у оружейника")
    armorer_sectors_svg = Attribute(caption=u"Представление секторов машинки у оружейника")


class Drone(Mobile):
    pass


class POI(Root):
    position = Position(caption=u"Координаты")
    p_visibility = Parameter(default=1, caption=u"Коэффициент заметности")


class RadioTower(POI):
    p_observing_range = Parameter(default=1000, caption=u"Радиус покрытия")


class MapLocation(POI):
    p_observing_range = Parameter(default=100, caption=u"Радиус входа")
    svg_link = Attribute(caption=u"Фон локации")  # todo: Сделать специальный атрибут для ссылки на файл
    title = Attribute(caption=u"Название локации")


class GasStation(MapLocation):
    u"""Заправочная станция"""


class Town(MapLocation):
    armorer = RegistryLink(caption=u'Оружейник')


class Institution(Root):
    title = Attribute(caption=u"Имя", doc=u"Радиус входа в город")
    photo = Attribute(caption=u"Фото")  # todo: Сделать специальный атрибут для ссылки на файл


class Armorer(Institution):
    pass


if __name__ == '__main__':
    pass
