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
        """@type: sublayers_server.model.tasks.Task | None"""
        self.task_list = []
        """@type: list[sublayers_server.model.tasks.Task]"""
        self.server.statics.append(self)
        self.server.static_observers.append(self)
        self.owner = owner

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

        if old_task != self.task:
            self.on_task_change(old_task, self.task)

    def on_task_change(self, old, new):
        self.on_change()

    def clear_tasks(self):
        self.task_list = []
        self.next_task()

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
        @rtype: sublayers_server.model.tasks.Task | None
        """
        return self._task

    task = property(fget=get_task)


class Station(Unit):
    u"""Class of buildings"""

    def __init__(self, observing_range=BALANCE.Station.observing_range, **kw):
        super(Station, self).__init__(observing_range=observing_range, **kw)


class Bot(Unit):
    u"""Class of mobile units"""

    def __init__(self, direction=-pi/2, observing_range=BALANCE.Bot.observing_range, **kw):
        self.motion = None
        """@type: sublayers_server.model.tasks.Motion | None"""
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
        @param position: sublayers_server.model.vectors.Point
        """
        path = build_trajectory(
            self.position,
            self.direction,
            self.max_velocity,  # todo: current velocity fix
            position,
        )

        self.set_tasklist([
            tasks.Goto(owner=self, target_point=segment['b'])
            for segment in path
        ], append=chain)

        #self.set_tasklist(tasks.Goto(owner=self, target_point=position), append=chain)  # Хорда вместо траектории
        return path

    @property
    def v(self):
        """
        Velocity vector

        @rtype: sublayers_server.model.vectors.Point
        """
        return self.motion.v if self.motion else None

    def get_position(self):
        """
        @rtype: sublayers_server.model.vectors.Point
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
        self._max_velocity = value

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

    def on_task_change(self, old, new):
        """
        @param old: sublayers_server.model.tasks.Task | None
        @param new: sublayers_server.model.tasks.Task | None
        """
        # todo: (!) Скрывать событие остановки если цепочка тасков перемещения не пуста
        old_motion = self.motion
        new_motion = new if isinstance(new, tasks.Motion) else None

        self.change_observer_state(False)

        if old_motion:
            self.server.motions.remove(old_motion)
        self.motion = new_motion
        if new_motion:
            self.server.motions.append(new_motion)
            if not old_motion:
                self.server.statics.remove(self)
        else:
            self.server.statics.append(self)

        self.change_observer_state(True)

        super(Bot, self).on_task_change(old, new)

    task = property(fget=Unit.get_task)

    # todo: test motions deletion from server
