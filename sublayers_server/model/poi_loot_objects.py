# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event
from sublayers_server.model.base import Observer
from sublayers_server.model.inventory import Inventory, ItemState
from sublayers_server.model.vectors import Point


class CreatePOILootEvent(Event):
    def __init__(self, server, time, poi_cls, example, inventory_size, position, life_time, items):
        super(CreatePOILootEvent, self).__init__(server=server, time=time)
        self.poi_cls = poi_cls
        self.example = example
        self.inventory_size = inventory_size
        self.position = position
        self.life_time = life_time
        self.items = items

    def on_perform(self):
        super(CreatePOILootEvent, self).on_perform()
        stash = self.poi_cls(server=self.server, time=self.time, example=self.example,
                             inventory_size=self.inventory_size, position=self.position, life_time=self.life_time)

        # заполнить инвентарь сундука
        for item in self.items:
            item.set_inventory(time=self.time, inventory=stash.inventory)


class POILoot(Observer):
    def __init__(self, server, time, life_time=None, example=None, inventory_size=None, position=None, **kw):
        assert (example is not None) or ((inventory_size is not None) and (position is not None))
        if example is None:
            example = server.reg['/poi/stash'].instantiate(position=position, inventory_size=inventory_size)
        super(POILoot, self).__init__(server=server, time=time, example=example, **kw)
        self.inventory = Inventory(max_size=self.example.inventory_size, owner=self, time=time)
        self.load_inventory(time=time)
        if life_time:
            self.delete(time=time + life_time)

    def is_available(self, agent):
        return agent.car in self.visible_objects

    def on_contact_in(self, time, obj):
        super(POILoot, self).on_contact_in(time=time, obj=obj)
        if hasattr(obj, 'owner') and obj.owner:
            self.inventory.add_manager(agent=obj.owner)

    def on_contact_out(self, time, obj):
        super(POILoot, self).on_contact_out(time=time, obj=obj)
        if hasattr(obj, 'owner') and obj.owner:
            self.inventory.del_visitor(agent=obj.owner, time=time)
            self.inventory.del_manager(agent=obj.owner)

    def load_inventory(self, time):
        for item_example in self.example.inventory:
            ItemState(server=self.server, time=time, example=item_example, count=item_example.amount)\
                .set_inventory(time=time, inventory=self.inventory, position=item_example.position)


class POIContainer(POILoot):
    def drop_item_to_map(self, item, time):
        CreatePOILootEvent(server=self.server, time=time, poi_cls=POILoot, example=None,
                           inventory_size=self.example.inventory_size,
                           position=Point.random_gauss(self.position(time), 10), life_time=60.0, items=[item]).post()