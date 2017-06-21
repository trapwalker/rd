# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.poi import Institution
from sublayers_server.model.registry_me.classes.quest_item import QuestItem
from sublayers_server.model.registry_me.tree import (
    Subdoc, 
    StringField, IntField, FloatField, ListField, EmbeddedDocumentField,
    EmbeddedNodeField,
)

import random


class BonusRec(Subdoc):
    item = EmbeddedNodeField(document_type=QuestItem, caption=u"Бонусный итем", reinst=True, tags={'client'})
    chance = FloatField(caption=u'Шанс выпадения итема', tags={'client'})


class ServiceRec(Subdoc):
    title = StringField(caption=u'Название услуги', tags={'client'})
    price = IntField(caption=u'Цена услуги', tags={'client'})
    image = StringField(caption=u'Изображение для услуги', tags={'client'})
    bonus_list = ListField(
        caption=u"Список бонусов",
        field=EmbeddedDocumentField(document_type=BonusRec),
        reinst=True,
    )


class Girl(Institution):
    service_list = ListField(
        caption=u"Список бонусов",
        field=EmbeddedDocumentField(document_type=ServiceRec, tags={'client'}),
        reinst=True,
        tags={'client'},
    )

    def get_bonus(self, service_index):
        # todo: REVIEW
        def get_item_index():
            value = random.random()
            cur_chance = 0
            index = 0
            for chance in chance_map:
                cur_chance += chance
                if value < cur_chance:
                    return index
                index += 1

        result = []
        # todo: validate service_index; exception handling!
        if service_index >= len(self.service_list):
            log.warning('Requested wrong service {!r} in {!r}'.format(service_index, self))
            return result

        service = self.service_list[service_index]
        all_chance = sum([item.chance for item in service.bonus_list])
        chance_map = [(item.chance / all_chance) for item in service.bonus_list]
        indexes = []
        # todo: handle exception if service.bonus_list is empty!
        for i in range(random.randint(1, min(3, len(service.bonus_list)))):
            index = get_item_index()
            while index in indexes:
                index = get_item_index()
            indexes.append(index)
            result.append(service.bonus_list[index].item.instantiate())
        return result
