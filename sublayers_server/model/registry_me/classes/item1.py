# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.item import Item
from sublayers_server.model.utils import NameGenerator


class PassengerItem(Item):
    def init_name(self):
        name_pair = NameGenerator.pair()
        self.title = u'{} {}'.format(name_pair[0], name_pair[1])
