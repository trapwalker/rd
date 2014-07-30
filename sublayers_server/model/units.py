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

    def __init__(self, owner=None, **kw):
        super(Unit, self).__init__(**kw)
        self._task = None
        """@type: model.tasks.Task | None"""
        self.task_list = []
        """@type: list[model.tasks.Task]"""
        self.server.statics.append(self)
        self.server.static_observers.append(self)
        self.owner = owner

    def add_task(self, task):
        if self.task:
            self.task_list.append(task)
        else:
            self.task = task

    def next_task(self):
        self.task = self.task_list.pop(0) if self.task_list else None
        log.debug('!!!!!!!!!!!!!!!!!!!!!!! NEXT TASK, %s, n=%s', self.task, len(self.task_list))

    def clear_tasks(self):
        self.task_list = []
        self.task = None

    def as_dict(self):
        d = super(Unit, self).as_dict()
        owner = self.owner
        d.update(
            owner=owner and owner.as_dict(),
        )
        return d

    def delete(self):
        self.clear_tasks()
        self.server.statics.remove(self)
        super(Unit, self).delete()
        # todo: check staticobservers deletion

    def change_observer_state(self, new_state):
        """
        @param new_state: bool
        """
        if new_state:
            self.server.static_observers.append(self)
        else:
            self.server.static_observers.remove(self)

    def get_task(self):
        """
        @rtype: model.tasks.Task | None
        """
        return self._task

    def set_task(self, task):
        """
        @param task: model.tasks.Task | None
        """
        old_task = self._task
        if old_task:
            old_task.cancel()
        self._task = task
        self.on_change()

    task = property(fget=get_task, fset=set_task)


class Station(Unit):
    u"""Class of buildings"""

    def __init__(self, observing_range=BALANCE.Station.observing_range, **kw):
        super(Station, self).__init__(observing_range=observing_range, **kw)


class Bot(Unit):
    u"""Class of mobile units"""

    def __init__(self, direction=-pi/2, observing_range=BALANCE.Bot.observing_range, **kw):
        self.motion = None
        """@type: model.tasks.Motion | None"""
        super(Bot, self).__init__(observing_range=observing_range, **kw)
        self._max_velocity = BALANCE.Bot.velocity
        self._direction = direction

    def as_dict(self):
        d = super(Bot, self).as_dict()
        d.update(
            motion=self.motion.as_dict() if self.motion else None,
            direction=self.direction,
            max_velocity=self.max_velocity,
        )
        return d

    def stop(self):
        self.clear_tasks()

    def goto(self, position, chain=False):
        """
        @param position: model.vectors.Point
        """
        path = build_trajectory(
            self.position,
            self.direction,
            self.max_velocity,  # todo: current velocity fix
            position,
        )

        if not chain:
            self.clear_tasks()

        for segment in path:
            self.add_task(tasks.Goto(self, segment['b']))

        #self.add_task(tasks.Goto(self, position))  # todo: (!) Добавлять траекторию пути вместо хорды
        return path

    @property
    def v(self):
        """
        Velocity vector

        @rtype: model.vectors.Point
        """
        return self.motion.v if self.motion else None

    def get_position(self):
        """
        @rtype: model.vectors.Point
        """
        return self.motion.position if self.motion else self._position

    position = property(fget=get_position, fset=Unit.set_position)

    @property
    def direction(self):
        """
        @rtype: float
        """
        return self.motion.direction if self.motion else self._direction

    @direction.setter
    def direction(self, value):
        self._direction = value

    @property
    def max_velocity(self):  # m/s
        """
        @rtype: float
        """
        return self._max_velocity

    @max_velocity.setter
    def max_velocity(self, value):
        motion = self.motion
        if motion:
            self.stop()  # todo: change speed refactoring
        self._max_velocity = value
        if motion:
            self.goto(motion.target_point)

    def change_observer_state(self, new_state):
        """
        @param new_state: bool
        """
        if self.motion is None:
            super(Bot, self).change_observer_state(new_state)

    def special_contacts_search(self):
        self_motion = self.motion
        if self_motion is None:
            return super(Bot, self).special_contacts_search()

        contacts = self.contacts

        contacts_with_static = self_motion.contacts_with_static
        for obj in self.server.filter_statics(None):  # todo: GEO-index clipping
            found = contacts_with_static(obj)
            if found:
                contacts.extend(found)
                obj.contacts.extend(found)

        contacts_with_dynamic = self_motion.contacts_with_dynamic
        for motion in self.server.filter_motions(None):  # todo: GEO-index clipping
            if motion.owner != self:
                found = contacts_with_dynamic(motion)
                if found:
                    contacts.extend(found)
                    motion.owner.contacts.extend(found)

    def set_task(self, task):
        """
        @param task: model.tasks.Task | None
        """
        # todo: (!) Скрывать событие остановки если цепочка тасков перемещения не пуста
        self.change_observer_state(False)
        old_motion = self.motion
        if old_motion:
            self.position = old_motion.position
            self.direction = old_motion.direction
            self.server.motions.remove(old_motion)
        new_motion = task if isinstance(task, tasks.Goto) else None
        self.motion = new_motion
        if new_motion:
            self.server.motions.append(new_motion)
            if not old_motion:
                self.server.statics.remove(self)
        else:
            self.server.statics.append(self)

        self.change_observer_state(True)

        super(Bot, self).set_task(task)

    task = property(fget=Unit.get_task, fset=set_task)

    # todo: test motions deletion from server
