# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import Item
from sublayers_server.model.registry.odm.fields import (
    IntField, StringField, FloatField, UniReferenceField, EmbeddedDocumentField, ListField,
)
from sublayers_server.model.registry.tree import Subdoc


class QuestInventory(Subdoc):
    items = ListField(reinst=True, base_field=EmbeddedDocumentField(
        embedded_document_type='sublayers_server.model.registry.classes.quest_item.QuestItem',
    ))

    def add_item(self, agent, item, event):
        if item.add_to_inventory(inventory=self, event=event):
            agent.change_quest_inventory(event)

    def del_item(self, agent, item, event):
        if item.del_from_inventory(inventory=self, event=event):
            agent.change_quest_inventory(event)

    def get_item_by_uid(self, uid):
        # todo: optimize
        for item in self.items or []:
            if item.uid == uid:
                return item

    def items_by_node_hash(self):
        d = dict()
        for item in self.items:
            d.update({item.node_hash(): item})
        return d


class QuestInventoryField(EmbeddedDocumentField):
    def __init__(self, embedded_document_type=QuestInventory, reinst=True, *av, **kw):
        super(QuestInventoryField, self).__init__(embedded_document_type=QuestInventory, reinst=reinst, *av, **kw)


class QuestItem(Item):
    group_id = StringField(caption=u'Тип квестового айтема')

    def add_to_inventory(self, inventory, event):
        inventory.items.append(self)
        return True

    def del_from_inventory(self, inventory, event):
        if self in inventory.items:
            inventory.items.remove(self)
            return True
        return False



















