# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute, Position, Parameter, FloatAttribute, TextAttribute
from sublayers_server.model.registry.attr.link import Slot
from sublayers_server.model.registry.attr.inv import InventoryAttribute
from sublayers_server.model.registry.classes.weapons import Weapon  # todo: осторожно с рекуррентным импортом
from sublayers_server.model.registry.classes.item import SlotLock  # tpodo: перенести к описанию слота
