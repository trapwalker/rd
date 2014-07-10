# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import Observer
import tasks
from balance import BALANCE


class Unit(Observer):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self, **kw):
        super(Unit, self).__init__(**kw)
        self._task = None
        """@type: model.tasks.Task | None"""
        self.server.statics.append(self)
        self.server.static_observers.append(self)

    def delete(self):
        del self.task
        self.server.statics.remove(self)
        super(Unit, self).delete()
        # todo: check staticobservers deletion

    def change_observer_state(self, new_state):
        """
        @param new_state: bool
        """
        if new_state:
            self.server.static_observers.append(self)
            self.on_change()
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

    def del_task(self):
        self.set_task(None)

    task = property(fget=get_task, fset=set_task, fdel=del_task)


class Station(Unit):
    u"""Class of buildings"""

    def __init__(self, observing_range=BALANCE.Station.observing_range, **kw):
        super(Station, self).__init__(observing_range=observing_range, **kw)


class Bot(Unit):
    u"""Class of mobile units"""

    def __init__(self, observing_range=BALANCE.Bot.observing_range, **kw):
        self.motion = None
        """@type: model.tasks.Goto | None"""
        super(Bot, self).__init__(observing_range=observing_range, **kw)
        self._max_velocity = BALANCE.Bot.velocity

    def as_dict(self):
        d = super(Bot, self).as_dict()
        log.debug('++++++++++++++++++ NEW MOTION: %r', self.motion)

        d.update(
            motion=self.motion.as_dict() if self.motion else None,
            max_velocity=self.max_velocity,
        )
        return d

    def stop(self):
        del self.task

    def goto(self, position):
        """
        @param position: model.vectors.Point
        """
        self.task = tasks.Goto(self, position)

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
    def max_velocity(self):  # m/s
        """
        @rtype: float
        """
        return self._max_velocity

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
        self.change_observer_state(False)
        old_motion = self.motion
        if old_motion:
            self.position = old_motion.position
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

    task = property(fget=Unit.get_task, fset=set_task, fdel=Unit.del_task)

    # todo: test motions deletion from server
