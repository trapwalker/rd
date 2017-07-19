# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import random
from sublayers_server.model.registry_me.classes.quests import DeliveryQuest
from sublayers_server.model.registry_me.tree import (
    Node, Subdoc,
    StringField, IntField, FloatField, ListField, EmbeddedDocumentField, DateTimeField, BooleanField,
    EmbeddedNodeField, RegistryLinkField,
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

