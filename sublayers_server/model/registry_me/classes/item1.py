# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.item import Item, ItemUsable
from sublayers_server.model.utils import NameGenerator


class PassengerItem(Item):
    def init_name(self):
        name_pair = NameGenerator.pair()
        self.title = u'{} {}'.format(name_pair[0], name_pair[1])


class Package(ItemUsable):
    @classmethod
    def activate(cls):
        from sublayers_server.model.transaction_events import TransactionActivatePackage
        return TransactionActivatePackage

    def can_activate(self, time, agent_model=None):
        return ((agent_model is not None) and (agent_model.car is not None) and
                (agent_model.car.inventory.get_free_position_count() >= len(self.post_activate_items)))