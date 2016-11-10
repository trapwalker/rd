# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Subdoc
from sublayers_server.model.registry.odm.fields import (
    IntField, FloatField, ListField, EmbeddedDocumentField, UniReferenceField,
)
from sublayers_server.model.registry.classes.quests import Quest, DeliveryQuest


class TeachingQuest(Quest):
    teaching_delivery_quest = EmbeddedDocumentField(embedded_document_type=DeliveryQuest, reinst=True)