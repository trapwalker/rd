# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class Party(object):

    def __init__(self, name):
        self.name = name
        self.members = []

    def as_dict(self):
        return dict(
            name=self.name,
            id=self.id,
        )

    def include(self, agent):
        old_party = agent.party
        log.debug('--------%s', agent.party)
        if old_party is self:
            return

        if old_party:
            old_party.exclude(agent, silent=True)

        self.members.append(agent)
        agent.party = self
        #agent.on_change_party(old=old_party)  todo: realize

    def exclude(self, agent, silent=False):
        if agent.party is not self:
            return

        agent.party = None
        self.members.remove(agent)
        #if not silent: agent.on_change_party(self)  todo: realize

    def __len__(self):
        return len(self.members)

    id = property(id)


class PartyDispatcher(dict):

    def __init__(self, parties=None):
        if parties is None:
            parties = [Party(u'Good'), Party(u'Bad')]

        self.update({party.name: party for party in parties})

    def get_smalest_party(self):
        return min(self.values(), key=Party.__len__) if self else None
