# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from datetime import datetime
import time
import math

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import (Attribute, Position, Parameter, TextAttribute, DictAttribute,
                                                  FloatAttribute, IntAttribute)
from sublayers_server.model.registry.attr.inv import InventoryAttribute
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.attr.price import PriceAttribute
from sublayers_server.model.registry.uri import URI

from itertools import chain


class POI(Root):
    position = Position(caption=u"Координаты")
    p_visibility_min = Parameter(default=1, caption=u"Минимальный коэффициент заметности")
    p_visibility_max = Parameter(default=1, caption=u"Максимальный коэффициент заметности")

    def get_modify_value(self, param_name, example_agent=None):
        return getattr(self, param_name, None)


class POIObserver(POI):
    p_observing_range = Parameter(default=50, caption=u"Радиус подбора лута")
    p_vigilance = Parameter(default=1, caption=u"Коэффициент зоркости")


class PoiStash(POIObserver):
    inventory = InventoryAttribute(caption=u'Инвентарь', doc=u'Список предметов в инвентаре сундука')
    inventory_size = Attribute(caption=u"размер инвентаря")


class RadioTower(POIObserver):
    pass


class MapLocation(POIObserver):
    svg_link = Attribute(caption=u"Фон локации")  # todo: Сделать специальный атрибут для ссылки на файл
    title = TextAttribute(caption=u"Название локации", tags='client')


class Building(object):
    def __init__(self, caption, head=None, instances=None, **kw):
        self.caption = caption
        self._head = head and URI(head)
        self._instances = [URI(inst) for inst in instances or []]
        # todo: checking errors
        self.__dict__.update(kw)

    @property
    def head(self):
        return self._head and self._head.resolve()

    @property
    def instances(self):
        # todo: need ##refactor
        if not hasattr(self, '_instances_resolved'):
            self._instances_resolved = [uri.resolve() for uri in self._instances]
        return self._instances_resolved

    def as_client_dict(self):
        d = dict(
            caption=self.caption,
            head=None if self._head is None else self._head.resolve().as_client_dict(),
            instances=[npc.as_client_dict() for npc in self.instances]
        )
        return d


class Town(MapLocation):
    buildings = DictAttribute(
        default=dict, itemclass=Building,
        caption=u'Здания', doc=u'В здании может располагаться несколько инстанций.')

    def get_npc_list(self):
        res = []
        for build in self.buildings.values():
            res.extend(build.instances)
        return res

    def as_client_dict(self):
        d = super(Town, self).as_client_dict()
        d.update(
            buildings=[dict(key=key, build=self.buildings[key].as_client_dict()) for key in self.buildings.keys()]
        )
        return d


class GasStation(Town):
    u"""Заправочная станция"""


class Institution(Root):
    title = TextAttribute(caption=u"Имя", tags='client')
    photo = Attribute(caption=u"Фото", tags='client')  # todo: Сделать специальный атрибут для ссылки на файл
    text = TextAttribute(caption=u"Текст приветствия", tags='client')
    type = TextAttribute(caption=u"Специальность NPC", tags='client')
    quests = Attribute(caption=u"Квесты")

    def as_dict4quest(self):
        pass


class Nucoil(Institution):
    type = TextAttribute(default='nucoil', caption=u"Специальность NPC")


class Armorer(Institution):
    type = TextAttribute(default='armorer', caption=u"Специальность NPC", tags='client')


class Mechanic(Institution):
    type = TextAttribute(default='mechanic', caption=u"Специальность NPC", tags='client')


class Tuner(Institution):
    type = TextAttribute(default='tuner', caption=u"Специальность NPC", tags='client')


class Trainer(Institution):
    type = TextAttribute(default='trainer', caption=u"Специальность NPC", tags='client')
    drop_price = IntAttribute(default=10, caption=u"Цена за сброс перков и навыков", tags='client')


class Trader(Institution):
    type = TextAttribute(default='trader', caption=u"Специальность NPC", tags='client')

    inventory_size = Attribute(default=10, caption=u"Размер инвентаря")
    inventory = InventoryAttribute(caption=u'Инвентарь', doc=u'Список предметов в инвентаре торговца')
    price = PriceAttribute(caption=u"Прайс")

    def as_client_dict(self, items=()):
        d = super(Trader, self).as_client_dict()
        d['price'] = self.price.get_pricelist(chain(items, self.inventory))
        return d

    def get_prices(self, items=()):
        return self.price.get_pricelist(chain(items, self.inventory))


class Hangar(Institution):
    type = TextAttribute(default='hangar', caption=u"Специальность NPC", tags='client')
    car_list = Attribute(caption=u"Список продаваемых машин", tags='client')


class Parking(Institution):
    type = TextAttribute(default='parking', caption=u"Специальность NPC", tags='client')
    cost_for_day_parking = FloatAttribute(default=10, caption=u'Стоимость дня у парковщика', tags='client')

    def get_car_price(self, car):
        # todo: сделать иначе работу с датой
        # Установка цены и может ли пользователь забрать машинка
        delta = car.date_setup_parking - time.mktime(datetime.now().timetuple())
        if delta < 0:
            delta = 0
            log.warning('Time parking = 0s !!! warning!!!!')
        delta_days = math.floor(delta / (60 * 60 * 24)) + 1
        return delta_days * self.cost_for_day_parking


class Mayor(Institution):
    type = TextAttribute(default='mayor', caption=u"Специальность NPC", tags='client')


class Barman(Institution):
    type = TextAttribute(default='barman', caption=u"Специальность NPC", tags='client')


class Girl(Institution):
    type = TextAttribute(default='girl', caption=u"Специальность NPC", tags='client')


class GasStationNPC(Institution):
    type = TextAttribute(default='npc_gas_station', caption=u"Специальность NPC", tags='client')


class NucoilHelpNPC(Institution):
    type = TextAttribute(default='nucoil_help_npc', caption=u"Специальность NPC", tags='client')

