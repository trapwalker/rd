# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from functools import update_wrapper

from state import State
from base import Observer
from balance import BALANCE
from math import pi
import events
import messages


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


    def generate_rocket(self):
        #log.debug('Unit Start Generate Rocket')
        Rocket(starter=self, server=self.server)


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
        self.init_params()


    def init_params(self):
        self.state = State(
            owner=self,
            t=self.server.get_time(),
            p=self._position,
            fi=self._direction,
            # todo: acc and velocity constrains and params
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


class Rocket(Mobile):
    def __init__(self, starter, life_time=BALANCE.Rocket.life_time, **kw):
        # todo: docstring required
        # взять позицию и направление выпустившего ракету
        self.starter = starter
        pos = starter.position
        direct = starter.direction
        self.state = None
        super(Rocket, self).__init__(position=pos, direction=direct,
                                     max_hp=BALANCE.Rocket.max_hp,
                                     observing_range=BALANCE.Rocket.observing_range,
                                     max_velocity=BALANCE.Rocket.v_max,
                                     **kw)

        server = self.server
        rocket = self

        def life_time_off(event=None):
            # запустить евент о смерти себя же
            log.debug('Start life_time_off !')

            def delete_this(event=None):
                log.debug('Start life_time_off  22222  !')
                rocket.delete()

            # todo после stop запустить евент на удаление себя с сервера, но почему-то t_max is None
            rocket.stop()
            if rocket.state.t_max is None:
                log.debug('=====================================================================================')
            else:
                log.debug('-------------------------------------------------------------------------------------')
            #rocket.cb_event = events.Callback(server=server, time=server.get_time() + rocket.state.t_max, func=delete_this, comment="Bang!!!!")
            #rocket.cb_event.send()


        self.cb_event = events.Callback(server=server, time=server.get_time() + life_time, func=life_time_off, comment="Bang!!!!")
        self.cb_event.send()


    def init_params(self):
        self.state = State(
            owner=self,
            t=self.server.get_time(),
            p=self.starter.position,
            fi=self.starter.direction,
            a_accelerate=BALANCE.Rocket.a_accelerate,
            a=BALANCE.Rocket.a_accelerate,
            v_max=BALANCE.Rocket.v_max,
            ac_max=BALANCE.Rocket.ac_max,
            a_braking=BALANCE.Rocket.a_braking,
            v=self.starter.v,
            cc=0.0
        )
        # если так не сделать, то не работают нормально Update евенты
        self.set_cc(value=1.0)

    def on_contact_in(self, time, obj, **kw):
        #log.debug('Rocket Contacn IN')
        #super(Rocket, self).on_contact_in(**kw)
        if obj is self.starter:
            return
        # todo: сделать евент (не мессадж, а именно евент) Bang, который будет отнимать хп у всего списка машинок, которые ракета задела
        if not isinstance(obj, Bot):  # чтобы ракеты не врезались друг в друга
            return

        if self.cb_event:  # если это наступило раньше евента на удаление или евента на стоп
            self.cb_event.cancel()  # todo: fixit

        for agent in self.subscribed_agents:
            self.server.post_message(messages.Bang(
                position=self.position,
                agent=agent,
                time=time,
                subj=self,
            ))
        # todo: запустить евент на немедленное удаление самого себя с сервера

    '''def delete(self):
        log.debug('delete Rocket !!!')
        # todo правильно очистить все контакты
        for agent in self.subscribed_agents:
            self.server.post_message(messages.Out(
                position=self.position,
                agent=agent,
                time=self.server.get_time(),
                subj=agent.cars[0],
                obj=self,
                is_last=True,
                is_boundary=False,
            ))

       ''' # todo вызвать super(Rocket, self).delete()





