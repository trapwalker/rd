# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Subdoc
from sublayers_server.model.registry.odm.fields import IntField, ListField, EmbeddedDocumentField
from sublayers_server.model.inventory import Inventory as ModelInventory, ItemState
from sublayers_server.model.events import Event

from collections import Counter


class LoadInventoryEvent(Event):
    def __init__(self, agent, inventory, **kw):
        super(LoadInventoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.inventory = inventory

    def on_perform(self):
        super(LoadInventoryEvent, self).on_perform()
        self.agent.inventory = self.inventory.create_model(self.server, self.time, owner=self.agent)
        self.agent.inventory.add_visitor(agent=self.agent, time=self.time)
        self.agent.inventory.add_manager(agent=self.agent)
        self.agent.inventory.add_change_call_back(self.agent.on_change_inventory)
        self.agent.on_change_inventory(self.agent.inventory, self.time)


class Inventory(Subdoc):
    size = IntField(caption=u'Размер инвентаря', default=1)
    items = ListField(reinst=True, base_field=EmbeddedDocumentField(
        embedded_document_type='sublayers_server.model.registry.classes.item.Item',
    ))

    # Уплотнить инвентарь
    def packing(self):
        new_items = []
        for add_item in self.items:
            if item.amount < item.stack_size:
                for item in new_items:
                    if (item.amount < item.stack_size) and (item.node_hash() == add_item.node_hash()):
                        d_amount = min((item.stack_size - item.amount), add_item.amount)
                        item.amount += d_amount
                        add_item.amount -= d_amount
                        if add_item.amount == 0:
                            break
            if add_item.amount > 0:
                new_items.append(add_item)
        self.items = new_items

    def add(self, item, count):
        for add_item in self.items:
            if (add_item.amount < add_item.stack_size) and (add_item.node_hash() == item.node_hash()):
                d_amount = min((add_item.stack_size - add_item.amount), count)
                add_item.amount += d_amount
                count -= d_amount
                if count == 0:
                    return
        while count > 0:
            d_amount = min(item.stack_size, count)
            self.items.append(item.instantiate(amount=d_amount))
            count -= d_amount
    
    def placing(self):
        u"""Расстановка неустановленных и расставленых с коллизией предметов по свободным ячейкам инвентаря"""
        changes = []
        positions = Counter((item.position for item in self.items or () if item.position is not None))
        i = 0
        for item in self.items or ():
            if item:
                while positions[i]:
                    i += 1
                if item.position is None or positions[item.position] > 1:
                    if item.position is not None:
                        positions[item.position] -= 1
                    item.position = i
                    positions[item.position] = 1
                    changes.append(item)
        return changes

    def get_item_by_uid(self, uid):
        # todo: optimize
        for item in self.items or []:
            if item.uid == uid:
                return item

    def create_model(self, server, time, owner=None):
        inventory = ModelInventory(max_size=self.size, owner=owner, example=self)
        for item_example in self.items:
            ItemState(
                server=server, time=time, example=item_example, count=item_example.amount,
            ).set_inventory(time=time, inventory=inventory, position=item_example.position)
        return inventory


class InventoryField(EmbeddedDocumentField):
    def __init__(self, embedded_document_type=Inventory, reinst=True, *av, **kw):
        super(InventoryField, self).__init__(embedded_document_type=Inventory, reinst=reinst, *av, **kw)
