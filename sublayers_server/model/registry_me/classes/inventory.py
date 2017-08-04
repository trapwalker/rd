# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.inventory import Inventory as ModelInventory, ItemState
from sublayers_server.model.events import Event
from sublayers_server.model.registry_me.tree import (
    Subdoc, 
    IntField, ListField, EmbeddedDocumentField,
    EmbeddedNodeField,
)

from collections import Counter


class LoadInventoryEvent(Event):
    def __init__(self, agent, inventory, total_inventory=None, make_game_log=True, **kw):
        super(LoadInventoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.inventory = inventory
        self.total_inventory = total_inventory
        self.make_game_log = make_game_log

    def on_perform(self):
        super(LoadInventoryEvent, self).on_perform()
        self.agent.inventory = self.inventory.create_model(self.server, self.time, owner=self.agent)
        self.agent.inventory.add_visitor(agent=self.agent, time=self.time)
        self.agent.inventory.add_manager(agent=self.agent)
        self.agent.inventory.add_change_call_back(self.agent.on_change_inventory_cb)
        self.agent.on_change_inventory(inventory=self.agent.inventory, time=self.time)
        if self.total_inventory is not None:
            self.agent.on_inv_change(
                event=self,
                diff_inventories=self.agent.inventory.example.diff_total_inventories(total_info=self.total_inventory),
                make_game_log=self.make_game_log)
        else:  #
            self.agent.on_inv_change(
                event=self,
                diff_inventories=self.agent.inventory.example.diff_total_inventories(total_info=dict()),
                make_game_log=self.make_game_log)


class Inventory(Subdoc):
    size = IntField(caption=u'Размер инвентаря', default=1)
    items = ListField(reinst=True, field=EmbeddedNodeField(
        document_type='sublayers_server.model.registry_me.classes.item.Item',
    ))

    # Уплотнить инвентарь
    def packing(self):
        new_items = []
        for add_item in self.items:
            if add_item.amount < add_item.stack_size:
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

    def add_item(self, item, count):
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

    def del_item(self, item, count):
        items = self.items
        for del_item in items:
            if del_item.node_hash() == item.node_hash():
                d_amount = min(del_item.amount, count)
                del_item.amount -= d_amount
                count -= d_amount
                if count == 0:
                    break
        self.items = []
        for add_item in items:
            if add_item.amount > 0:
                self.items.append(add_item)
        return count == 0
    
    def get_item_by_uid(self, uid):
        # todo: optimize
        for item in self.items or []:
            if item.uid == uid:
                return item
        return None

    def placing(self):
        u"""Расстановка неустановленных и расставленых с коллизией предметов по свободным ячейкам инвентаря"""
        changes = []
        positions = Counter((item.position for item in self.items or () if item.position is not None))
        i = 0
        for item in self.items or ():
            if item:
                while positions[i]:
                    i += 1
                if (item.position is None) or (positions[item.position] > 1):
                    if item.position is not None:
                        positions[item.position] -= 1
                    item.position = i
                    positions[item.position] = 1
                    changes.append(item)
        return changes

    def create_model(self, server, time, owner=None):
        self.placing()
        inventory = ModelInventory(max_size=self.size, owner=owner, example=self)
        for item_example in self.items:
            if item_example.amount > 0:
                ItemState(
                    server=server, time=time, example=item_example, count=item_example.amount,
                ).set_inventory(time=time, inventory=inventory, position=item_example.position)
        return inventory

    def items_by_node_hash(self):
        d = dict()
        for item in self.items:
            d.update({item.node_hash(): item})
        return d

    def total_item_type_info(self):
        res = Counter()
        for item in self.items:
            res[item.node_hash()] += item.amount
        return dict(res)

    def diff_total_inventories(self, total_info):
        now_total_info = self.total_item_type_info()
        incomings = dict()
        outgoings = dict()

        for key, old_value in total_info.items():
            now_value = now_total_info.get(key, None)
            if now_value is None:  # Если такого типа итема в текущем инвентаре нет
                outgoings.update({key: old_value})
            elif old_value != now_value:
                if old_value > now_value:  # Если сейчас меньше, чем раньше
                    outgoings.update({key: old_value - now_value})
                else:  # Если сейчас больше, чем раньше
                    incomings.update({key: now_value - old_value})

        for key, value in now_total_info.items():
            if total_info.get(key, None) is None:  # Значит итем есть только в текущем инвентаре
                incomings.update({key: value})

        return dict(
            incomings=incomings,
            outgoings=outgoings
        )


class InventoryField(EmbeddedDocumentField):
    def __init__(self, document_type=Inventory, reinst=True, *av, **kw):
        super(InventoryField, self).__init__(document_type=Inventory, reinst=reinst, **kw)
