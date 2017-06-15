# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import random
from sublayers_server.model.registry_me.classes.quests import DeliveryQuest
from sublayers_server.model.registry_me.tree import Node, Subdoc, EmbeddedNodeField, RegistryLinkField

from mongoengine import (
    StringField, IntField, FloatField, ListField, EmbeddedDocumentField, DateTimeField, BooleanField,
)


class DeliveryQuestSimple(DeliveryQuest):
    def get_available_lvl(self):
        relation = self.agent.profile.get_relationship(npc=self.hirer)
        lvl_table = [-0.8, -0.6, 0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1]
        for item in lvl_table:
            if relation < item:
                return lvl_table.index(item)
        return len(lvl_table)

    def init_level(self):
        self.level = self.get_available_lvl()

        # Этот код нужен чтобы всегда генерить хотябы самый слабый квест
        if self.level == 0:
            self.level = 1

        self.level = random.randint(1, self.level)

    def init_delivery_set(self):
        self.delivery_set = []
        for i in range(self.level):
            # Выбор только по первому элементу списка (т.к. в простой реализации квеста естьтолько список итемов а не пресеты)
            choice = random.choice(self.delivery_set_list[0])
            item = choice.instantiate(amount=choice.amount)
            self.delivery_set.append(item)

    def init_distance(self):
        town1 = self.hirer.hometown
        town2 = self.recipient.hometown
        return self.distance_table.get_distance(town1=town1, town2=town2)

    def init_deadline(self, distance):
        # Время выделенное на квест в секундах
        all_time = distance / 14

        # Время выделенное на квест кратно 5 минутам
        self.deadline = (all_time / 300) * 300 + (300 if (all_time % 300) > 0 else 0)


class DeliveryPassengerQuest(DeliveryQuestSimple):
    person_delivery_cost = IntField(caption=u'Стоимость достваки одного пассажира', tags={'client'})

    destination_list = ListField(
        default=[],
        caption=u"Список пунктов назначения доставки",
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.poi.Town', )
    )
    destination = RegistryLinkField(
        caption=u'Пункт назначения', document_type='sublayers_server.model.registry_me.classes.poi.Town', tags={'client'})

    def init_distance(self):
        town1 = self.hirer.hometown
        town2 = self.destination
        return self.distance_table.get_distance(town1=town1, town2=town2)

    def init_text(self):
        self.text_short = u"Доставьте пассажиров в гороод {}.".format(self.destination.title)
        self.text = u"Доставьте пассажиров: {} - в гороод {}. Награда: {:.0f}nc.".format(
            ', '.join([item.title for item in self.delivery_set]),
            self.destination.title,
            self.reward_money
        )

    def give_passengers(self, event):
        if not self.can_give_items(items=self.delivery_set, event=event):
            return False
        total_inventory_list = (
            None if self.agent.profile._agent_model.inventory is None
            else self.agent.profile._agent_model.inventory.example.total_item_type_info()
        )
        inst_list = []
        for passenger in self.delivery_set:
            inst_list.append(passenger.instantiate())
        self.delivery_set = inst_list
        for passenger in self.delivery_set:
            passenger.init_name()
            self.agent.profile.car.inventory.items.append(passenger)
        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.reload_inventory(time=event.time, save=False, total_inventory=total_inventory_list)
        return True

    def can_take_passengers(self, event):
        if not self.agent.car:
            return False

        if self.agent.profile._agent_model and self.agent.profile._agent_model.inventory:
            self.agent.profile._agent_model.inventory.save_to_example(time=event.time)

        for passenger in self.delivery_set:
            if not self.agent.profile.car.inventory.get_item_by_uid(uid=passenger.uid):
                return False
        return True

    def take_passengers(self, event):
        if not self.can_take_passengers(event=event):
            return False

        inventory_list = self.agent.profile.car.inventory.items[:]
        for passenger in self.delivery_set:
            item = self.agent.profile.car.inventory.get_item_by_uid(uid=passenger.uid)
            inventory_list.remove(item)
        self.agent.profile.car.inventory.items = inventory_list

        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.reload_inventory(time=event.time, save=False)
        return True
