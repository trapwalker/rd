# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import Observer
import tasks
from balance import BALANCE
from trajectory import build_trajectory
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
        self._task = None
        """@type: sublayers_server.model.tasks.Task | None"""
        self.task_list = []
        """@type: list[sublayers_server.model.tasks.Task]"""
        self.server.statics.append(self)
        self.server.static_observers.append(self)
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

    def set_tasklist(self, task_or_list, append=False):
        if isinstance(task_or_list, tasks.Task):
            task_or_list = [task_or_list]

        if append:
            self.task_list += list(task_or_list)
        else:
            self.task_list = list(task_or_list)

        if not self.task or not append:
            self.next_task()

    def next_task(self):
        old_task = self.task
        if old_task:
            if old_task.is_worked:
                old_task.cancel()
            self._task = None

        if self.task_list:
            while self.task_list:
                self._task = self.task_list.pop(0)
                try:
                    self.task.start()
                except tasks.ETaskParamsUnactual as e:
                    log.warning('Skip unactual task: %s', e)
                    self._task = None
                    continue
                else:
                    break

    def clear_tasks(self):
        self.task_list = []
        self.next_task()

    def as_dict(self, to_time=None):
        log.debug('Unit as_dict')
        d = super(Unit, self).as_dict()
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
        self.clear_tasks()
        self.server.statics.remove(self)
        super(Unit, self).delete()
        # todo: check staticobservers deletion

    @property
    def task(self):
        """
        @rtype: sublayers_server.model.tasks.Task | None
        """
        return self._task


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
        self.old_motion = None
        """@type: sublayers_server.model.tasks.Motion | None"""
        self.motion = None
        """@type: sublayers_server.model.tasks.Motion | None"""
        super(Bot, self).__init__(max_hp=max_hp, observing_range=observing_range, **kw)
        self._max_velocity = max_velocity

    def as_dict(self, to_time=None):
        if not to_time:
            to_time = self.server.get_time()
        d = super(Bot, self).as_dict(to_time)
        d.update(
            motion=self.motion.motion_info(to_time) if self.motion else None,
            max_velocity=self.max_velocity,
        )
        return d

    def stop(self):
        self.clear_tasks()

    def goto(self, position, chain=False):
        """
        @param position: sublayers_server.model.vectors.Point
        """
        log.debug('======== GOTO ++++++')
        self.clear_tasks()
        assert self.motion is None, 'ATTENTION! If You see this text, please call server developer: %s' % self.motion
        path = build_trajectory(
            self.position,
            self.direction,
            self.max_velocity,  # todo: current velocity fix
            position,
        )

        self.set_tasklist([
            tasks.GotoArc(owner=self, target_point=segment['b'], arc_params=segment)
            if 'r' in segment else
            tasks.Goto(owner=self, target_point=segment['b'])

            for segment in path
        ], append=chain)

        #self.set_tasklist(tasks.Goto(owner=self, target_point=position), append=chain)  # Хорда вместо траектории
        log.debug('======== GOTO ------')
        return path

    @property
    def v(self):
        """
        Velocity vector

        @rtype: sublayers_server.model.vectors.Point
        """
        return self.motion.v if self.motion else None

    @Unit.position.getter
    def position(self):
        """
        @rtype: sublayers_server.model.vectors.Point
        """
        if self.motion and (isinstance(self.motion, tasks.Goto) and self.motion.vector is None or not self.motion.is_started):
            log.warning('Wrong motion state: {!r} (started={})', self.motion, self.motion.is_started)
        return self.motion.position if self.motion and self.motion.is_started else self._position

    @Unit.direction.getter
    def direction(self):
        """
        @rtype: float
        """
        return self.motion.direction if self.motion else super(Bot, self).direction

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
        for obj in self.server.filter_statics(None):  # todo: GEO-index clipping
            detect_contacts_with_static(obj)

        detect_contacts_with_dynamic = self_motion.detect_contacts_with_dynamic
        for motion in self.server.filter_motions(None):  # todo: GEO-index clipping
            if motion.owner != self:
                detect_contacts_with_dynamic(motion)

    # todo: test motions deletion from server
