# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import Item
from sublayers_server.model.registry.odm.fields import (
    IntField, StringField, DateTimeField, UniReferenceField, EmbeddedDocumentField, ListField,
)
from sublayers_server.model.registry.tree import Subdoc


class QuestInventory(Subdoc):
    items = ListField(reinst=True, base_field=EmbeddedDocumentField(
        embedded_document_type='sublayers_server.model.registry.classes.quest_item.QuestItem',
    ))

    def add_item(self, agent, item, event, need_change=True):
        if item.add_to_inventory(inventory=self, event=event) and need_change:
            agent.change_quest_inventory(event)

    def del_item(self, agent, item, event, need_change=True):
        if item.del_from_inventory(inventory=self, event=event) and need_change:
            agent.change_quest_inventory(event)

    def refresh(self, agent, event):
        temp_items = self.items[:]
        need_change = False
        for item in temp_items:
            if not item.is_actual(inventory=self, event=event):
                need_change = True
                self.del_item(agent=agent, item=item, event=event, need_change=False)
        if need_change:
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
    starttime = DateTimeField(tags='client', caption=u'Время добавления итема в инвентарь', doc=u'Время старта квеста')
    deadline = IntField(tags='client', caption=u'Время жизни итема в инвентаре', doc=u'')

    def add_to_inventory(self, inventory, event):
        inventory.items.append(self)
        self.starttime = event.time
        return True

    def del_from_inventory(self, inventory, event):
        if self in inventory.items:
            inventory.items.remove(self)
            return True
        return False

    def is_actual(self, inventory, event):
        return (self.deadline == 0) or (self.starttime + self.deadline > event.time)


















