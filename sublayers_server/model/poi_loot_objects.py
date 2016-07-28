# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event
from sublayers_server.model.base import Observer
from sublayers_server.model.inventory import Inventory, ItemState
from sublayers_server.model.vectors import Point


class CreatePOILootEvent(Event):
    def __init__(self, server, time, poi_cls, example, inventory_size, position, life_time, items, connect_radius=50,
                 sub_class_car=None, car_direction=None):
        super(CreatePOILootEvent, self).__init__(server=server, time=time)
        self.poi_cls = poi_cls
        self.example = example
        self.inventory_size = inventory_size
        self.position = position
        self.life_time = life_time
        self.items = items
        self.connect_radius = connect_radius
        self.sub_class_car = sub_class_car
        self.car_direction = car_direction

    def on_perform(self):
        super(CreatePOILootEvent, self).on_perform()
        objs = self.server.visibility_mng.get_around_objects(pos=self.position, time=self.time)
        stash = None
        for obj in objs:
            if isinstance(obj, POILoot):
                if obj.position(time=self.time).distance(target=self.position) <= self.connect_radius:
                    stash = obj
                    free_size = stash.inventory.max_size - stash.inventory.get_item_count()
                    if free_size < len(self.items):
                        stash.inventory.inc_max_size(d_size=(len(self.items) - free_size), time=self.time)
                    break

        if not stash:
            if self.poi_cls is POICorpse:
                stash = POICorpse(server=self.server, time=self.time, example=self.example,
                                  inventory_size=self.inventory_size, position=self.position,
                                  life_time=self.life_time, sub_class_car=self.sub_class_car,
                                  car_direction=self.car_direction)
            else:
                stash = self.poi_cls(server=self.server, time=self.time, example=self.example,
                                     inventory_size=self.inventory_size, position=self.position,
                                     life_time=self.life_time)

        # заполнить инвентарь сундука
        for item in self.items:
            item.set_inventory(time=self.time, inventory=stash.inventory)


class CheckPOILootEmptyEvent(Event):
    def __init__(self, server, time, poi_loot):
        super(CheckPOILootEmptyEvent, self).__init__(server=server, time=time)
        self.poi_loot = poi_loot

    def on_perform(self):
        super(CheckPOILootEmptyEvent, self).on_perform()
        if self.poi_loot.inventory.get_item_count() == 0:
            self.poi_loot.delete(time=self.time)


class POIContainer(Observer):
    def __init__(self, server, time, life_time=None, example=None, inventory_size=None, position=None, **kw):
        def callback():
            super(POIContainer, self).__init__(server=server, time=time, example=example, **kw)
            self.inventory = Inventory(max_size=self.example.inventory_size, owner=self, time=time)
            self.load_inventory(time=time)
            if life_time:
                self.delete(time=time + life_time)

        assert (example is not None) or ((inventory_size is not None) and (position is not None))
        if example is None:
            example = server.reg['poi/stash'].instantiate(position=position, inventory_size=inventory_size)
            example.load_references(callback=callback())


    def is_available(self, agent):
        return agent.car in self.visible_objects

    def on_contact_in(self, time, obj):
        super(POIContainer, self).on_contact_in(time=time, obj=obj)
        if hasattr(obj, 'owner') and obj.owner:
            self.inventory.add_manager(agent=obj.owner)

    def on_contact_out(self, time, obj):
        super(POIContainer, self).on_contact_out(time=time, obj=obj)
        if hasattr(obj, 'owner') and obj.owner:
            self.inventory.del_visitor(agent=obj.owner, time=time)
            self.inventory.del_manager(agent=obj.owner)

    def load_inventory(self, time):
        for item_example in self.example.inventory:
            ItemState(server=self.server, time=time, example=item_example, count=item_example.amount)\
                .set_inventory(time=time, inventory=self.inventory, position=item_example.position)

    def drop_item_to_map(self, item, time):
        CreatePOILootEvent(server=self.server, time=time, poi_cls=POILoot, example=None,
                           inventory_size=1,
                           position=Point.random_gauss(self.position(time), 10), life_time=600.0, items=[item]).post()


class POILoot(POIContainer):
    def __init__(self, **kw):
        super(POILoot, self).__init__(**kw)
        self.inventory.add_change_call_back(method=self.change_inventory)

    def drop_item_to_map(self, item, time):
        pass

    def change_inventory(self, inventory, time):
        if inventory.get_item_count() == 0:
            CheckPOILootEmptyEvent(server=self.server, time=time + 0.1, poi_loot=self).post()

    def on_before_delete(self, event):
        self.inventory.del_change_call_back(method=self.change_inventory)
        super(POILoot, self).on_before_delete(event=event)


class POICorpse(POIContainer):
    def __init__(self, sub_class_car, car_direction, **kw):
        super(POICorpse, self).__init__(**kw)
        self.sub_class_car = sub_class_car
        self.car_direction = car_direction

    def as_dict(self, time):
        d = super(POICorpse, self).as_dict(time=time)
        d.update(sub_class_car=self.sub_class_car, car_direction=self.car_direction)
        return d
