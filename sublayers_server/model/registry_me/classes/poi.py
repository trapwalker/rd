# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from datetime import datetime
import time
import math

from sublayers_server.model.registry_me.classes.inventory import InventoryField
from sublayers_server.model.registry_me.tree import (
    Node, Subdoc,
    IntField, FloatField, StringField, ListField, EmbeddedDocumentField,
    RegistryLinkField, EmbeddedNodeField, PositionField,
    LocalizedStringField,
)


class POI(Node):
    position = PositionField(caption=u"Координаты")
    p_visibility_min = FloatField(caption=u"Минимальный коэффициент заметности", tags={'parameter', 'param_aggregate'})
    p_visibility_max = FloatField(caption=u"Максимальный коэффициент заметности", tags={'parameter', 'param_aggregate'})

    def get_modify_value(self, param_name, example_agent=None):
        return getattr(self, param_name, None)

    def param_aggregate(self, example_agent):
        d = dict()
        for param_name, attr, getter in self.iter_attrs(tags={'param_aggregate'}):
            d[param_name] = getattr(self, param_name)

        return d

    def distance_to(self, poi):
        p1 = self.position.as_point()
        p2 = poi.position.as_point()
        return p1.distance(p2)


class POIObserver(POI):
    p_observing_range = FloatField(caption=u"Радиус подбора лута", tags={'parameter', 'param_aggregate'})
    p_vigilance = FloatField(caption=u"Коэффициент зоркости", tags={'parameter', 'param_aggregate'})


class PoiStash(POIObserver):
    inventory = InventoryField(caption=u'Инвентарь', doc=u'Список предметов в инвентаре сундука')
    # inventory_size = IntField(caption=u"размер инвентаря")


class RadioTower(POIObserver):
    radio_point_name = StringField(caption=u'Техническое имя', tags={'client'})
    pass


class RadiationArea(POIObserver):
    radiation_dps = FloatField(caption=u"DPS зоны радиации")


class MapRespawn(POIObserver):
    respawn_time = FloatField(caption=u"Время респауна следующего объекта")
    respawn_radius = FloatField(caption=u"Радиус разброса")
    respawn_objects = ListField(
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.poi.POIObserver'),
    )


class MapPowerUp(POIObserver):
    model_class_name = StringField(caption=u'Имя модельного класса')
    icon_name = StringField(caption=u'Имя иконки в iconManager')
    activate_comment = LocalizedStringField(caption=u'Комментарий для лога')
    life_time = FloatField(caption=u"Время жизни")


class MapPowerUpEffects(MapPowerUp):
    effects = ListField(
        caption=u'Эффекты', doc=u'Список эффектов (URI), накладываемых при срабатывании PowerUp',
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.effects.Effect'),
    )
    effect_time = FloatField(caption=u"Время действия эффектов")


class MapPowerUpShield(MapPowerUp):
    duration_time = FloatField(caption=u"Время действия щита")


class MapPowerUpAddItems(MapPowerUp):
    items = ListField(
        caption=u'Итемы', doc=u'Список итемов, добавляемых при срабатывании PowerUp',
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.item.Item'),
    )


class MapLocation(POIObserver):
    svg_link = StringField(caption=u"Фон локации")  # todo: Сделать специальный атрибут для ссылки на файл
    p_enter_range = FloatField(caption=u"Радиус входа в город", tags={'parameter', 'param_aggregate', 'client'})


class Building(Subdoc):
    name = StringField(caption=u'Техническое имя', tags={'client'})  # todo: identify string constrain
    caption = LocalizedStringField(caption=u'Название', tags={'client'})
    title = LocalizedStringField(caption=u'Заголовок', tags={'client'})
    head = RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.poi.Institution', tags={'client'})
    instances = ListField(
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.poi.Institution'),
        tags={'client'},
    )


class Town(MapLocation):
    static_image_list = ListField(
        field=StringField(),
        caption=u'StaticImages', doc=u'Список статических файлов этого города'
    )

    buildings = ListField(  # todo: (!) Обойти все упоминания и исправить интерфейс
        field=EmbeddedDocumentField(document_type=Building),
        caption=u'Здания', doc=u'В здании может располагаться несколько инстанций.',
        #tags={'client'},
    )

    delay_attack = IntField(caption=u'Промежуток между атаками')
    aggro_time = IntField(caption=u'Длительность агра города в секундах')

    _town_npc_list = None

    def get_npc_list(self):
        # info: данный метод кеширует свой результат
        # todo: rename to get_instances_list
        res = self._town_npc_list or []
        if not res:
            for building in self.buildings:
                res.extend(building.instances)
                if building.head not in res:
                    res.append(building.head)
            self._town_npc_list = res
        return self._town_npc_list

    def get_npc_by_type(self, type):
        for npc in self.get_npc_list():
            if isinstance(npc, type):
                return npc

    def as_client_dict(self):
        # todo: Убрать, когда реализуется в корневом классе
        d = super(Town, self).as_client_dict()
        d.update(buildings=[building.as_client_dict() for building in self.buildings])  # todo: fix client format
        return d

    def get_building_by_type(self, type):
        for build in self.buildings:
            if build.name == type:
                return build
        return None


class GasStation(Town):
    u"""Заправочная станция"""


class Institution(Node):
    trading = IntField(caption=u"Навык торговли NPC", root_default=0, tags={'client'})
    karma = FloatField(caption=u"Значение кармы NPC", tags={'client'})
    # Сумма следующих 3 коэффициентов должна давать 1
    koef_karma = FloatField(caption=u"Коэффициент влияния кармы на отношение данного NPC")
    koef_rel_index = FloatField(caption=u"Коэффициент влияния индекса отношения на отношение данного NPC")
    koef_pont_points = FloatField(caption=u"Коэффициент влияния очков крутости на отношение данного NPC")

    hometown = RegistryLinkField(
        doc=u"Ссылка на родной город НПЦ, необходимая для подсчёта расстояний между нпц",
        document_type='sublayers_server.model.registry_me.classes.poi.MapLocation',
        caption=u"Родной город НПЦ",
    )

    photo = StringField(caption=u"Фото", tags={'client'})  # todo: Сделать специальный атрибут для ссылки на файл
    text = LocalizedStringField(caption=u"Текст приветствия", tags={'client'})
    type = StringField(caption=u"Специальность NPC", tags={'client'})
    quests = ListField(
        caption=u"Генераторы квестов",
        reinst=True,
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.quests.Quest',
            reinst=True,
        ),
    )

    @property
    def karma_norm(self):
        return min(max(self.karma / 100, -1), 1)

    def get_trading_effect(self, agent_example):
        return 1 - (agent_example.profile.get_current_agent_trading() - self.trading + 100) / 200.0


class SlotWorker(Institution):
    clear_cost = FloatField(caption=u'Стоимость освобождения слота', root_default=0.025, tags={'client'})
    setup_cost = FloatField(caption=u'Стоимость установки в слот', root_default=0.05, tags={'client'})
    margin_slot = FloatField(caption=u'Маржа с которой работает NPC', root_default=0.2, tags={'client'})


class Trainer(Institution):
    drop_price = IntField(caption=u"Цена за сброс перков и навыков", tags={'client'})


class Mechanic(SlotWorker):
    margin_repair = FloatField(caption=u'Маржа с которой ремонтирует NPC', root_default=0.2, tags={'client'})
    repair_cost = FloatField(caption=u"Коэффициент стоимости ремонта от стоимости машины", root_default=0.5, tags={'client'})


class Parking(Institution):
    cost_for_day_parking = FloatField(caption=u'Стоимость дня у парковщика', tags={'client'})

    def get_car_price(self, car):
        # todo: сделать иначе работу с датой
        # Установка цены и может ли пользователь забрать машинка
        delta = time.mktime(datetime.now().timetuple()) - car.date_setup_parking
        if delta < 0:
            log.warning('Car %r was paring %fs (<0, set to zero)!', car, delta)
            delta = 0
        if delta < 60 * 60: # Если прошло менее часа, то цена будет равна 0
            return 0
        delta_days = math.floor(delta / (60 * 60 * 24)) + 1
        return delta_days * self.cost_for_day_parking


class Nukeoil(Institution):
    insurance_list = ListField(
        caption=u"Список продаваемых страховок", tags={'client'},
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.insurance.Insurance'),
    )


class GasStationNPC(Institution):
    fuel_cost = FloatField(caption=u'Стоимость одного литра топлива', tags={'client'})