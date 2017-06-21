# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.exptable import Pair
from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.odm.fields import UniReferenceField, IntField, FloatField, ListField, EmbeddedDocumentField


class PartyTables(Root):
    leading = ListField(
        caption=u'Таблица расстояний между локациями',
        base_field=EmbeddedDocumentField(embedded_document_type=Pair),
    )

    def get_party_capacity(self, agent):
        agent_leading = agent.leading.calc_value()
        result = 0
        for pair in self.leading:
            if pair.k <= agent_leading:
                result = pair.v
            else:
                return result
        return result
