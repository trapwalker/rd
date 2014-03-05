# -*- coding: utf-8 -*-

from balance import BALANCE
from base import VisibleObject
from observe import Observer
import tasks


class Unit(VisibleObject):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self, **kw):
        super(Unit, self).__init__(**kw)
        self.observer = None
        self.set_task(self.default_task())

    def default_task(self):
        return None

    def get_task(self):
        return self._task

    def set_task(self, task):
        old_task = self._task
        self._task = task
        # todo: remove old timeline events, add new

    def del_task(self):
        self.set_task(None)

    task = property(fget=get_task, fset=set_task, fdel=del_task)


class Station(Unit):
    u"""Class of buildings"""

    def __init__(self, **kw):
        super(Station, self).__init__(**kw)
        self.server.statics.append(self)


class Bot(Unit):
    u"""Class of mobile units"""

    def __init__(self, **kw):
        super(Bot, self).__init__(**kw)
        self.motion = None

    def stop(self, done=False, next_task=None):
        del(self.task)

    def goto(self, position):
        self.task = tasks.Goto(position)

    def get_position(self):
        return self.motion.position if self.motion else self.position

    @property
    def max_velocity(self):  # m/s
        return BALANCE.get_MaxVelocity(self)

    def set_task(self, task):
        old_motion = self.motion
        if old_motion:
            self.position = old_motion.position
            self.server.motions.remove(old_motion)
        super(Bot, self).set_task(task)
        new_motion = task if isinstance(task, tasks.Goto) else None
        self.motion = new_motion
        if new_motion:
            self.server.motions.append(new_motion)



