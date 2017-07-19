# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.poi_loot_objects import CreatePOILootEvent, CreatePOICorpseEvent, QuestPrivatePOILoot
from sublayers_server.model.inventory import ItemState
from sublayers_server.model.vectors import Point
from sublayers_server.model.registry_me.classes.quests import Quest, QuestRange, MarkerMapObject
from sublayers_server.model.registry_me.classes.quests1 import DeliveryQuestSimple
from sublayers_server.model.registry_me.tree import (
    Subdoc, ListField, IntField, FloatField, EmbeddedDocumentField, EmbeddedNodeField, PositionField, UUIDField,
)
from sublayers_server.model.registry_me.classes import notes

import random


class DeliveryFromCache(DeliveryQuestSimple):
    cache_radius = FloatField(caption=u'Радиус, в котором можно обнаружить тайник', root_default=50)

    cache_points_generator = ListField(
        root_default=[],
        caption=u"Список областей генерации мест для тайника",
        field=EmbeddedDocumentField(document_type=MarkerMapObject),
        reinst=False,
    )
    cache_point = EmbeddedDocumentField(document_type=MarkerMapObject, reinst=False)

    loot_set_list = ListField(
        root_default=list,
        caption=u"Список возможных комплектов ненужных вещей",
        field=ListField(
            caption=u"Комплект ненужных вещей",
            field=EmbeddedNodeField(
                document_type='sublayers_server.model.registry_me.classes.item.Item',
                caption=u"Необходимый итем",
            ),
        ),
        #reinst=True,
    )
    loot_set = ListField(
        caption=u"Список ненужных вещей",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.item.Item',
            caption=u"Необходимый итем",
        ),
    )

    def init_level(self):
        self.level = 1

    def generate_reward(self):
        self.reward_money = 0
        self.reward_karma = 2
        self.reward_relation_hirer = 5

    def init_delivery_set(self):
        # Тут гененрация посылок
        self.delivery_set = []
        choice = random.choice(self.delivery_set_list[0])
        item = choice.instantiate(amount=choice.amount)
        self.delivery_set.append(item)

        # Тут гененрация ненужных вещей
        self.loot_set = []
        for i in range(random.choice([3, 4])): # 3-4 предмета
            choice = random.choice(self.loot_set_list[0])
            item = choice.instantiate(amount=choice.amount)
            self.loot_set.append(item)

    def init_target_point(self):
        base_point = random.choice(self.cache_points_generator)
        self.cache_point = MarkerMapObject(position=base_point.generate_random_point(), radius=self.cache_radius)

    def init_distance(self):
        p1 = self.hirer.hometown.position.as_point()
        p2 = self.cache_point.position.as_point()
        return p1.distance(p2) * 2  # дистация двойная, так как нужно съездить туда и обратно

    def init_deadline(self, distance):
        # Время выделенное на квест в секундах
        if self.design_speed:
            all_time = int(distance / self.design_speed)
            # Время выделенное на квест кратно 5 минутам
            self.deadline = (all_time / 300) * 300 + (300 if (all_time % 300) > 0 else 0)
        else:
            self.deadline = 0

    def init_text(self):
        self.text_short = u"Найти пропавшую посылку."
        self.text = u"Вернуть пропавшую посылку.{} Награда: {:.0f}nc, {:.0f} кармы и {:.0f}ед. опыта.".format(
            u"." if not self.deadline else u" за {}.".format(self.deadline_to_str()),
            self.reward_money,
            self.reward_karma,
            self.reward_exp,
        )

    def create_poi_container(self, event):
        if self.deadline:
            life_time = self.starttime + self.deadline - event.time
        else:
            life_time = event.server.poi_loot_objects_life_time
        private_name = self.agent.profile._agent_model and self.agent.profile._agent_model.print_login() or self.agent.login

        items = []
        item = self.delivery_set[0].instantiate(amount=self.delivery_set[0].amount)
        items.append(ItemState(server=event.server, time=event.time, example=item, count=item.amount))
        self.dc.package_uid = item.uid
        for item_example in self.loot_set:
            item = item_example.instantiate(amount=item_example.amount)
            items.append(ItemState(server=event.server, time=event.time, example=item, count=item.amount))

        CreatePOILootEvent(
            server=event.server,
            time=event.time,
            poi_cls=QuestPrivatePOILoot,
            example=None,
            inventory_size=len(self.delivery_set) + len(self.loot_set),
            position=Point.random_gauss(self.cache_point.position.as_point(), self.cache_point.radius),
            life_time=life_time,
            items=items,
            connect_radius=0,
            extra=dict(private_name=private_name),
        ).post()

    def can_take_package(self, event):
        if not self.agent.profile.car:
            return False
        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.inventory.save_to_example(time=event.time)
        return self.agent.profile.car.inventory.get_item_by_uid(uid=self.dc.package_uid) is not None

    def take_items_package(self, event):
        if not self.can_take_package(event=event):
            return False
        item = self.agent.profile.car.inventory.get_item_by_uid(uid=self.dc.package_uid)
        self.agent.profile.car.inventory.items.remove(item)
        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.reload_inventory(time=event.time, save=False)
        return True

    def as_client_dict(self):
        d = super(DeliveryFromCache, self).as_client_dict()
        d.update(
            package_example=self.delivery_set[0].as_client_dict() if self.delivery_set and len(self.delivery_set) > 0 else None,
            package_uid=getattr(self.dc, 'package_uid', None)
        )
        return d

