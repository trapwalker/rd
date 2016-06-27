# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.odm import AbstractDocument
from sublayers_server.model.registry.odm.fields import ListField, EmbeddedDocumentField

from collections import Counter

class Inventory(AbstractDocument):
    items = ListField(EmbeddedDocumentField('sublayers_server.model.registry.classes.item.Item'))

    def placing(self):
        u"""Расстановка неустановленных и расставленых с коллизией предметов по свободным ячейкам инвентаря"""
        changes = []
        positions = Counter((item.position for item in self if item.position is not None))
        i = 0
        for item in self.items:
            while positions[i]:
                i += 1
            if item.position is None or positions[item.position] > 1:
                if item.position is not None:
                    positions[item.position] -= 1
                item.position = i
                changes.append(item)
                i += 1
        return changes


class InventoryField(EmbeddedDocumentField):
    def __init__(self, embedded_document_type=Inventory, *av, **kw):
        super(InventoryField, self).__init__(embedded_document_type=Inventory, *av, **kw)
