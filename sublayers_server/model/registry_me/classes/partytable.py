# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import Node, ListField, EmbeddedDocumentField
from sublayers_server.model.registry_me.classes.perks import PerkPartyPassive


class PartyTables(Node):
    leading = ListField(
        caption=u'Таблица расстояний между локациями',
        field=EmbeddedDocumentField(document_type='sublayers_server.model.registry_me.classes.exptable.Pair'),
    )

    def get_party_capacity(self, agent):
        agent_leading = agent.profile.leading.calc_value()
        # оценка по перкам
        perk_capacity = 0
        for perk in agent.profile.perks:
            if isinstance(perk, PerkPartyPassive):
                perk_capacity += perk.additional_capacity

        # оценка по лидерству
        leading_capacity = 0
        for pair in self.leading:
            if pair.k <= agent_leading:
                leading_capacity = pair.v
            else:
                return leading_capacity + perk_capacity
        return leading_capacity + perk_capacity
