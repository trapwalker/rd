# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)
from sublayers_server.model.messages import Message
from sublayers_server.model.base import Object


class ParkingBagMessage(Message):
    def __init__(self, parking_bag, parking_npc, car_title, **kw):
        super(ParkingBagMessage, self).__init__(**kw)
        self.parking_bag = parking_bag
        self.parking_npc = parking_npc
        self.car_title = car_title

    def as_dict(self):
        d = super(ParkingBagMessage, self).as_dict()
        d.update(
            parking_bag_id=self.parking_bag.id,
            npc_html_hash=self.parking_npc.node_html(),
            car_title=self.car_title
        )
        return d


class ParkingBag(Object):
    def __init__(self, agent, example_inventory, time):
        super(ParkingBag, self).__init__(server=agent.server, time=time)
        self.inventory = example_inventory.create_model(self.server, time, owner=self)
        self.inventory.add_visitor(agent=agent, time=time)
        self.inventory.add_manager(agent=agent)
        self.inventory.add_change_call_back(agent.on_change_inventory_cb)
        agent.on_change_inventory(inventory=self.inventory, time=time)
        self.agent = agent

    def displace(self, time):
        self.inventory.save_to_example(time=time)
        self.inventory.del_all_visitors(time=time)
        self.inventory = None
        self.agent = None

    def is_available(self, agent):
        return self.agent and agent is self.agent
