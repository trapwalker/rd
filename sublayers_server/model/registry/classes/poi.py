# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute, Position, Parameter, TextAttribute, DictAttribute
from sublayers_server.model.registry.attr.inv import InventoryAttribute
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.attr.price import PriceAttribute
from sublayers_server.model.registry.uri import URI

from itertools import chain


class POI(Root):
    position = Position(caption=u"Координаты")
    p_visibility = Parameter(default=1, caption=u"Коэффициент заметности")
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
    title = TextAttribute(caption=u"Название локации")


class GasStation(MapLocation):
    u"""Заправочная станция"""


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


class Town(MapLocation):
    armorer = RegistryLink(caption=u'Оружейник')
    mechanic = RegistryLink(caption=u'Механик')
    tuner = RegistryLink(caption=u'Тюнер')
    trader = RegistryLink(caption=u'Торговец')
    hangar = RegistryLink(caption=u'Ангар')
    nucoil = RegistryLink(caption=u'Заправка')
    trainer = RegistryLink(caption=u'Тренер: прокачка навыков и перков')
    parking = RegistryLink(caption=u'Автостоянка')

    buildings = DictAttribute(
        default=dict, itemclass=Building,
        caption=u'Здания', doc=u'В здании может располагаться несколько инстанций.')


class Institution(Root):
    title = TextAttribute(caption=u"Имя")
    photo = Attribute(caption=u"Фото")  # todo: Сделать специальный атрибут для ссылки на файл
    text = TextAttribute(caption=u"Текст приветствия")
    type = TextAttribute(caption=u"Специальность NPC")
    quests = Attribute(caption=u"Квесты")

    def as_dict4quest(self):
        pass


class Nucoil(Institution):
    type = TextAttribute(default='nucoil', caption=u"Специальность NPC")


class Armorer(Institution):
    type = TextAttribute(default='armorer', caption=u"Специальность NPC")


class Mechanic(Institution):
    type = TextAttribute(default='mechanic', caption=u"Специальность NPC")


class Tuner(Institution):
    type = TextAttribute(default='tuner', caption=u"Специальность NPC")


class Trainer(Institution):
    type = TextAttribute(default='trainer', caption=u"Специальность NPC")


class Trader(Institution):
    type = TextAttribute(default='trader', caption=u"Специальность NPC")

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
    type = TextAttribute(default='hangar', caption=u"Специальность NPC")
    car_list = Attribute(caption=u"Список продаваемых машин")

class Parking(Institution):
    type = TextAttribute(default='parking', caption=u"Специальность NPC")