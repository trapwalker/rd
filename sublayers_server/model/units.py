# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from functools import update_wrapper

from state import State
from base import Observer
from balance import BALANCE
from math import pi
import events


def async_call(method):
    def cover(self, time=None, **kw):
        def async_closure(event):
            log.debug('async_closure: kw=%r', kw)
            return method(self, time=event.time, **kw)

        events.Callback(server=self.server, time=time, func=async_closure).send()
    update_wrapper(cover, method)
    return cover


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
                self.on_update(time=self.server.get_time(), comment='HP {}->{}'.format(self.hp, new_hp))
                # todo: on_update params
                # todo: 'hit' and 'fire' events and messages

    def on_die(self):
        # todo: refactor
        if isinstance(self, Bot):
            self.stop()  # todo: fixit
        self.on_update(time=self.server.get_time(), comment='RIP')

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

class Mobile(Unit):
    u"""Class of mobile units"""

    def __init__(self,
                 max_hp=BALANCE.Bot.max_hp,
                 observing_range=BALANCE.Bot.observing_range,
                 max_velocity=BALANCE.Bot.velocity,
                 **kw):
        super(Mobile, self).__init__(max_hp=max_hp, observing_range=observing_range, **kw)
        self._max_velocity = max_velocity
        self._state_events = []
        self.state = State(
            owner=self,
            t=self.server.get_time(),
            p=self._position,
            fi=self._direction,
            # todo: acc and velociti constrains and params
        )

    def as_dict(self, to_time=None):
        if not to_time:
            to_time = self.server.get_time()
        d = super(Mobile, self).as_dict(to_time=to_time)
        d.update(
            state=self.state.export(),
            max_velocity=self.max_velocity,
        )
        return d

    def stop(self, time=None):
        events.Update(subj=self, time=time, cc=0).send()
        # todo: clear target_point

    def goto(self, position, time=None):
        """
        @param position: sublayers_server.model.vectors.Point
        """
        # todo: chaining
        events.Update(subj=self, time=time, target_point=position).send()

    def set_cc(self, value, time=None):
        # todo: docstring
        events.Update(subj=self, time=time, cc=value).send()

    def set_turn(self, turn, time=None):
        # todo: docstring
        events.Update(subj=self, time=time, turn=turn).send()

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


class Bot(Mobile):
    pass
