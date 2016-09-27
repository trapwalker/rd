# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)
from sublayers_server.model.events import Event
from sublayers_server.model.messages import Message
from sublayers_server.model.base import Object


# class InitBarterEvent(Event):
#     def __init__(self, initiator, recipient_login, **kw):
#         super(InitBarterEvent, self).__init__(server=initiator.server, **kw)
#         self.initiator = initiator
#         self.recipient_login = recipient_login
#
#     def on_perform(self):
#         super(InitBarterEvent, self).on_perform()
#         recipient = self.server.agents_by_name.get(str(self.recipient_login), None)
#         if not recipient:
#             return


class ParkingBagMessage(Message):
    def __init__(self, parking_bag, parking_npc, **kw):
        super(ParkingBagMessage, self).__init__(**kw)
        self.parking_bag = parking_bag
        self.parking_npc = parking_npc

    def as_dict(self):
        d = super(ParkingBagMessage, self).as_dict()
        d.update(
            parking_bag_id=self.parking_bag.id,
            npc_html_hash=self.parking_npc.node_html()
        )
        return d


class ParkingBag(Object):
    def __init__(self, agent, example_inventory, time):
        super(ParkingBag, self).__init__(server=agent.server, time=time)
        self.inventory = example_inventory.create_model(self.server, time, owner=self)
        self.inventory.add_visitor(agent=agent, time=time)
        self.inventory.add_manager(agent=agent)
        self.inventory.add_change_call_back(agent.on_change_inventory)
        agent.on_change_inventory(self.inventory, time)
        self.agent = agent

    def displace(self, time):
        self.inventory.save_to_example(time=time)
        self.inventory.del_all_visitors(time=time)
        self.inventory = None
        self.agent = None

    def is_available(self, agent):
        return self.agent and agent is self.agent
