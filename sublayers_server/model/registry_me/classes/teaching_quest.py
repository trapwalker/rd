# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.quests import Quest, DeliveryQuest
from sublayers_server.model.registry_me.tree import EmbeddedNodeField


class TeachingQuest(Quest):
    teaching_delivery_quest = EmbeddedNodeField(document_type=DeliveryQuest, reinst=True)


class TeachingMapQuest(Quest):
    pass