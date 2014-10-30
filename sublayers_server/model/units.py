# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from state import State
from base import Observer
from balance import BALANCE
from math import pi


class Unit(Observer):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self, owner=None, max_hp=None, direction=-pi/2, defence=BALANCE.Unit.defence, weapons=None,
                 role=None,
                 **kw):
        """
        @param sublayers_server.model.agents.Agent owner: Object owner
        @param float max_hp: Maximum health level
        @param float direction: Direction angle of unit
        @param list[sublayers_server.model.weapons.weapon] weapons: Set of weapon
        @param sublayers_server.model.party.Role role: role of unit into the party of agent
        """
        super(Unit, self).__init__(**kw)
        self.role = role
        log.debug('BEFORE owner set')
        self.owner = owner
        log.debug('AFTER owner set')
        self.max_hp = max_hp
        self._hp = max_hp
        self._direction = direction
        self.defence = defence
        if weapons:
            for weapon in weapons:
                weapon.owner = self
        # todo: (!) attach/detach weapon and other stuff to/from unit (event)
        self.weapons = weapons or []
        """@type: list[sublayers_server.model.weapon.Weapon]"""

    @property
    def direction(self):
        """
        @rtype: float
        """
        return self._direction

    @direction.setter
    def direction(self, value):
        self._direction = value

    @property
    def is_died(self):
        return self.hp == 0

    @property
    def hp(self):
        return self._hp

    def hit(self, hp):
        if self.max_hp is None:
            return

        hp *= self.defence

        if not hp:
            return

        new_hp = self.hp
        new_hp -= hp
        if new_hp < 0:
            new_hp = 0

        if new_hp > self.max_hp:
            new_hp = self.max_hp

        if new_hp != self.hp:
            self._hp = new_hp
            if new_hp == 0:
                self.on_die()  # todo: implementation
            else:
                self.on_change(comment='HP {}->{}'.format(self.hp, new_hp))

    def on_die(self):
        self.stop()
        self.on_change(comment='RIP')

    def as_dict(self, to_time=None):
        d = super(Unit, self).as_dict(to_time=to_time)
        owner = self.owner
        d.update(
            owner=owner and owner.as_dict(),
            direction=self.direction,
            hp=self.hp,
            max_hp=self.max_hp,
            weapons=[weapon.as_dict(to_time=to_time) for weapon in self.weapons],
            role=None if self.role is None else self.role.name,
        )
        return d

    def delete(self):
        if self.role:
            self.role.remove_car(self)
            # todo: rename
        super(Unit, self).delete()
        # todo: check staticobservers deletion


class Station(Unit):
    u"""Class of buildings"""

    def __init__(self, max_hp=BALANCE.Station.max_hp, observing_range=BALANCE.Station.observing_range, **kw):
        super(Station, self).__init__(max_hp=max_hp, observing_range=observing_range, **kw)


class Bot(Unit):
    u"""Class of mobile units"""

    def __init__(self,
                 max_hp=BALANCE.Bot.max_hp,
                 observing_range=BALANCE.Bot.observing_range,
                 max_velocity=BALANCE.Bot.velocity,
                 **kw):
        super(Bot, self).__init__(max_hp=max_hp, observing_range=observing_range, **kw)
        self._max_velocity = max_velocity
        self.state = State(
            t=self.server.get_time(),
            p=self._position,
            fi=self._direction,
            # todo: acc and velociti constrains and params
        )

    def as_dict(self, to_time=None):
        if not to_time:
            to_time = self.server.get_time()
        d = super(Bot, self).as_dict(to_time=to_time)
        d.update(
            state=self.state.export(),
            max_velocity=self.max_velocity,
        )
        return d

    def stop(self):
        self.state.update(t=self.server.get_time(), cc=0)

    def goto(self, position, chain=False):
        """
        @param position: sublayers_server.model.vectors.Point
        """
        # todo: chaining
        self.state.update(t=self.server.get_time(), target_point=position)
        return None

    def set_cc(self, value):
        # todo: docstring
        self.state.update(t=self.server.get_time(), cc=value)

    def set_turn(self, way=0):
        # todo: docstring
        self.state.update(t=self.server.get_time(), turn=way)

    @property
    def v(self):
        """
        Velocity vector

        @rtype: sublayers_server.model.vectors.Point
        """
        return self.state.v(t=self.server.get_time())

    @Unit.position.getter
    def position(self):
        """
        @rtype: sublayers_server.model.vectors.Point
        """
        return self.state.p(t=self.server.get_time())

    @Unit.direction.getter
    def direction(self):
        """
        @rtype: float
        """
        return self.state.fi(t=self.server.get_time())

    @property
    def max_velocity(self):  # m/s
        """
        @rtype: float
        """
        return self._max_velocity

    @max_velocity.setter
    def max_velocity(self, value):
        self._max_velocity = value

    def special_contacts_search(self):
        self_motion = self.motion
        if self_motion is None:
            return super(Bot, self).special_contacts_search()

        detect_contacts_with_static = self_motion.detect_contacts_with_static
        for obj in self.server.filter_static(None):  # todo: GEO-index clipping
            detect_contacts_with_static(obj)

        detect_contacts_with_dynamic = self_motion.detect_contacts_with_dynamic
        for motion in self.server.filter_moving(None):  # todo: GEO-index clipping
            if motion.owner != self:
                detect_contacts_with_dynamic(motion)

    # todo: test motions deletion from server
