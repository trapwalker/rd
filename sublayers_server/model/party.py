# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from weapons import SectoralWeapon
from vectors import Point

from math import pi


def inc_name_number(name):
    clear_name = name.rstrip('0123456789')
    num = int(name[len(clear_name):] or '0') + 1
    return '{}{}'.format(clear_name, num)


class Party(object):
    party_names = set()

    def __init__(self, name=None):
        if name is None:
            name = self.__class__.__name__

        while name in self.party_names:
            name = inc_name_number(name)
        self.party_names.add(name)

        self.name = name
        self.members = []
        """@type list[agents.Agent]"""

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

        log('Agent %s including to %s. Cars=%s', agent, self, agent.cars)
        '''
        # todo: fix it
        old_agent_observers = agent.observers[:]
        old_member_observers = self.members[0].observers[:]

        for o in old_member_observers:
            agent.add_observer(o)

        for a in self.members:
            for o in old_agent_observers:
                a.add_observer(o)
        #'''

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

    def __str__(self):
        return '<Party {self.name}/{n}>'.format(self=self, n=len(self))

    id = property(id)


class PartyDispatcher(dict):

    def __init__(self, parties=None):
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
    def __init__(self, base_point, roles, respawn_sigma=Point(100, 100), **kw):
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
            weapons=[
                SectoralWeapon(direction=0, sector_width=45, r=400),
                SectoralWeapon(direction=pi, sector_width=45, r=350),
                SectoralWeapon(direction=pi * 1.5, sector_width=60, r=300),
                SectoralWeapon(direction=pi/2, sector_width=60, r=300),
            ],
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
