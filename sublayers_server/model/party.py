# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point


def inc_name_number(name):
    clear_name = name.rstrip('0123456789')
    num = int(name[len(clear_name):] or '0') + 1
    return '{}{}'.format(clear_name, num)


class Party(object):
    parties = {}

    def __init__(self, owner=None, name=None):
        if name is None:
            name = self.__class__.__name__

        while name in self.parties:
            name = inc_name_number(name)
        self.parties[name] = self

        self.name = name
        self.owner = owner
        self.members = []  # todo: may be set of agents?
        """@type list[agents.Agent]"""
        self.invites = []  # todo: may be set of agents?
        """@type list[agents.Agent]"""
        if owner is not None:
            self.include(owner)  # todo: may be async call?

    @classmethod
    def search(cls, name):
        return cls.parties.get(name)

    @classmethod
    def search_or_create(cls, name):
        return cls.search(name) or cls(name)

    def as_dict(self):
        return dict(
            name=self.name,
            id=self.id,
        )

    def include(self, agent):
        old_party = agent.party
        if old_party is self:
            return

        if old_party:
            old_party.exclude(agent, silent=True)

        self.on_include(agent)
        self.members.append(agent)
        agent.party = self
        log.info('Agent %s included to party %s. Cars=%s', agent, self, agent.cars)
        #agent.on_change_party(old=old_party)  todo: realize

    def on_include(self, agent):
        # todo: fix it
        if len(self.members) == 0:
            return
        old_agent_observers = agent.observers[:]
        old_member_observers = self.members[0].observers[:]

        for o in old_member_observers:
            agent.add_observer(o)

        for a in self.members:
            for o in old_agent_observers:
                a.add_observer(o)

    def on_exclude(self, agent):
        pass

    def invite(self, user):
        if user not in self.invites:
            self.invites.append(user)
            # todo: send invitation message

    def exclude(self, agent, silent=False):
        if agent.party is not self:
            log.warning('Trying to exclude unaffilated agent (%s) from party %s', agent, self)
            return

        agent.party = None
        self.members.remove(agent)
        self.on_exclude(agent)
        log.info('Agent %s excluded from party %s', agent, self)
        #if not silent: agent.on_change_party(self)  # todo: realize

    def __len__(self):
        return len(self.members)

    def __str__(self):
        return '<Party {self.name}/{n}>'.format(self=self, n=len(self))

    id = property(id)

    def __contains__(self, agent):
        return agent in self.members


class PartyDispatcher(dict):

    def __init__(self, parties=None):
        super(PartyDispatcher, self).__init__()
        from first_mission_parties import Corp, Band
        if parties is None:
            parties = [Corp(), Band()]

        self.update({party.name: party for party in parties})

    def get_smalest_party(self):
        return min(self.values(), key=Party.__len__) if self else None


class Role(object):
    def __init__(self, name, car_params=None, max_count=None, weight=1):
        self.name = name
        self.car_params = car_params or {}
        self.weight = weight
        self.max_count = max_count
        self.cars = []
        self.car_params.update(role=self)

    @property
    def is_full(self):
        return self.max_count and len(self) >= self.max_count

    @property
    def k(self):
            return 0 if self.is_full else (self.weight / (1.0 + len(self)))

    def __len__(self):
        return len(self.cars)

    def __str__(self):
        return '<Role {self.name}/{n}>'.format(self=self, n=len(self))

    def remove_car(self, car):
        # todo: rename
        try:
            self.cars.remove(car)
        except ValueError:
            pass

    def clear_dead(self):
        self.cars = [car for car in self.cars if car.hp > 0]

    def init_car(self, agent, default_params=None, override_params=None):
        params = dict(default_params) if default_params else {}
        params.update(self.car_params)
        if override_params:
            params.update(override_params)

        cls = params.pop('cls')

        car = cls(
            server=agent.server,
            owner=agent,
            **params
        )
        self.cars.append(car)
        return car


class RoleParty(Party):
    def __init__(self, base_point, roles, respawn_sigma=Point(1, 1), **kw):
        super(RoleParty, self).__init__(**kw)
        self.base_point = base_point
        self.respawn_sigma = respawn_sigma
        rlist = []
        for r in roles:
            if isinstance(r, dict):
                r = Role(**r)
            elif isinstance(r, basestring):
                r = Role(r)

            rlist.append(r)

        self.roles = rlist

    def car_base_params(self):
        return dict(
            weapons=[],
        )

    def clear_dead(self):
        for role in self.roles:
            role.clear_dead()

    def init_car(self, agent, default_params=None, override_params=None):
        self.clear_dead()
        role = max(self.roles, key=lambda r: r.k)
        pos = Point.random_gauss(self.base_point, self.respawn_sigma)

        params = dict(default_params) if default_params else {}
        params.update(self.car_base_params(), position=pos)
        car = role.init_car(agent=agent, default_params=params, override_params=override_params)
        agent.append_car(car)
        return car
