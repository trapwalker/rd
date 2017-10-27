# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import (
    Node, Subdoc,FloatField, IntField, ListField, EmbeddedDocumentField, RegistryLinkField,
)

import random


class DropRecord(Subdoc):
    item = RegistryLinkField(
        caption=u"Item",
        document_type='sublayers_server.model.registry_me.classes.item.Item',
    )
    chance = FloatField(caption="Шанс выпадения предмета")
    level = IntField(caption="Уровень предмета")


class DropTable(Node):
    table = ListField(
        caption=u'Таблица расстояний между локациями',
        field=EmbeddedDocumentField(document_type=DropRecord),
    )

    def _get_loot_list(self, min_level, max_level):
        if min_level > max_level:
            min_level, max_level = max_level, min_level
        for rec in self.table:
            if min_level <= rec.level <= max_level:
                yield rec

    def get_items(self, levels, count):
        # levels = pair or list[2] with int type
        # log.debug("DropTable:: get_items => levels={}, count = {}".format(levels, count))
        min_level, max_level = min(levels[0], levels[1]), max(levels[0], levels[1])
        count_loot = count
        iter_count = 0
        items = []
        loot_rec_list = []
        while not loot_rec_list and min_level >= 0:
            loot_rec_list = list(self._get_loot_list(min_level=min_level, max_level=max_level))
            min_level -= 1

        if not loot_rec_list:
            log.warn("Not found drop items for levels=%s", (min_level, max_level))
            return items

        total_chance = 0
        for item_rec in loot_rec_list:
            total_chance += item_rec.chance

        while count_loot >= 1:
            random_item = None
            chance = random.random() * total_chance
            cur_chance = 0
            for item_rec in loot_rec_list:
                cur_chance += item_rec.chance
                if chance <= cur_chance:
                    random_item = item_rec
                    break
            if random_item:
                item = random_item.item.instantiate()
                item.randomize_params()  # Если это оружие, то оно срандомит свои характеристики
                items.append(item)
                count_loot -= 1

        return items