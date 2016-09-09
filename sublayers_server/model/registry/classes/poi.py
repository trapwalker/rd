# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from datetime import datetime
import time
import math

from sublayers_server.model.registry.tree import Root, Subdoc
from sublayers_server.model.registry.odm_position import PositionField
from sublayers_server.model.registry.classes.inventory import InventoryField
from sublayers_server.model.registry.odm.fields import (
    IntField, FloatField, StringField, ListField, UniReferenceField, EmbeddedDocumentField,
)
from sublayers_server.model.registry.classes.price import PriceField

from itertools import chain


class POI(Root):
    position = PositionField(caption=u"Координаты")
    p_visibility_min = FloatField(caption=u"Минимальный коэффициент заметности")
    p_visibility_max = FloatField(caption=u"Максимальный коэффициент заметности")

    def get_modify_value(self, param_name, example_agent=None):
        return getattr(self, param_name, None)


class POIObserver(POI):
    p_observing_range = FloatField(caption=u"Радиус подбора лута")
    p_vigilance = FloatField(caption=u"Коэффициент зоркости")


class PoiStash(POIObserver):
    inventory = InventoryField(caption=u'Инвентарь', doc=u'Список предметов в инвентаре сундука')
    inventory_size = IntField(caption=u"размер инвентаря")


class RadioTower(POIObserver):
    pass


class MapLocation(POIObserver):
    svg_link = StringField(caption=u"Фон локации")  # todo: Сделать специальный атрибут для ссылки на файл


class Building(Subdoc):
    name = StringField(caption=u'Техническое имя', tags='client')  # todo: identify string constrain
    caption = StringField(caption=u'Название', tags='client')
    title = StringField(caption=u'Заголовок', tags='client')
    head = UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.poi.Institution',
        tags='client',
    )
    instances = ListField(
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.poi.Institution'),
        tags='client',
    )


class Town(MapLocation):
    buildings = ListField(  # todo: (!) Обойти все упоминания и исправить интерфейс
        base_field=EmbeddedDocumentField(embedded_document_type=Building),
        caption=u'Здания', doc=u'В здании может располагаться несколько инстанций.',
        tags='client',
    )

    def get_npc_list(self):
        # todo: rename to get_instances_list
        res = []
        for building in self.buildings:
            res.extend(building.instances)
        return res

    def as_client_dict(self):
        # todo: Убрать, когда реализуется в корневом классе
        d = super(Town, self).as_client_dict()
        d.update(buildings=[building.as_client_dict() for building in self.buildings])  # todo: fix client format
        return d


class GasStation(Town):
    u"""Заправочная станция"""


class Institution(Root):
    photo = StringField(caption=u"Фото", tags='client')  # todo: Сделать специальный атрибут для ссылки на файл
    text = StringField(caption=u"Текст приветствия", tags='client')
    type = StringField(caption=u"Специальность NPC", tags='client')
    # quests = ListField(
    #     caption=u"Квесты",
    #     base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.quests.Quest'),
    # )

    def as_dict4quest(self):  # todo: устранить
        pass


class Trainer(Institution):
    drop_price = IntField(caption=u"Цена за сброс перков и навыков", tags='client')


class Trader(Institution):
    inventory_size = IntField(caption=u"Размер инвентаря")
    inventory = InventoryField(caption=u'Инвентарь', doc=u'Список предметов в инвентаре торговца')
    price = PriceField(caption=u"Прайс-лист")

    def as_client_dict(self, items=None):
        d = super(Trader, self).as_client_dict()
        # todo: registry fix it
        d['price'] = {item.node_hash(): option for item, option in self.get_prices(items).items()}
        return d

    def get_prices(self, items=None):
        return self.price.get_pricelist(chain(items or (), self.inventory.items))


class Hangar(Institution):
    car_list = ListField(
        caption=u"Список продаваемых машин", tags='client',
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.mobiles.Car'),
    )


class Parking(Institution):
    cost_for_day_parking = FloatField(caption=u'Стоимость дня у парковщика', tags='client')

    def get_car_price(self, car):
        # todo: сделать иначе работу с датой
        # Установка цены и может ли пользователь забрать машинка
        delta = car.date_setup_parking - time.mktime(datetime.now().timetuple())
        if delta < 0:
            log.warning('Car %r was paring %fs (<0, set to zero)!', car, delta)
            delta = 0
        delta_days = math.floor(delta / (60 * 60 * 24)) + 1
        return delta_days * self.cost_for_day_parking
