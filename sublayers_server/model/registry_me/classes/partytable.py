# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import Node

from mongoengine import ListField, EmbeddedDocumentField


class PartyTables(Node):
    leading = ListField(
        caption=u'Таблица расстояний между локациями',
        field=EmbeddedDocumentField(document_type='sublayers_server.model.registry_me.classes.exptable.Pair'),
    )

    def get_party_capacity(self, agent):
        agent_leading = agent.profile.leading.calc_value()
        result = 0
        for pair in self.leading:
            if pair.k <= agent_leading:
                result = pair.v
            else:
                return result
        return result
