# -*- coding: utf-8 -*-

from balance import BALANCE
from base import VisibleObject
from observe import Observer
import tasks


class Unit(VisibleObject):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self, **kw):
        super(Unit, self).__init__(**kw)
        self._task = None
        self._observer = None
        defaut_task = self.default_task()
        if defaut_task:
            self.set_task(defaut_task)

    def delete(self):
        del(self.task)
        del(self.observer)
        super(Unit, self).delete()

    def change_observer_state(self, new_state):
        observer = self._observer
        if observer:
            if new_state:
                self.server.static_observers.append(observer)
            else:
                self.server.static_observers.remove(observer)

    def get_observer(self):
        return self._observer

    def set_observer(self, observer):
        self.change_observer_state(False)
        self._observer = observer
        self.change_observer_state(True)

    def del_observer(self):
        self.set_observer(None)

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
    observer = property(fget=get_observer, fset=set_observer, fdel=del_observer)


class Station(Unit):
    u"""Class of buildings"""

    def __init__(self, **kw):
        super(Station, self).__init__(**kw)
        self.server.statics.append(self)

    def delete(self):
        self.server.statics.remove(self)
        super(Station, self).delete()


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

    def change_observer_state(self, new_state):
        if self.motion is None:
            super(Bot, self).change_observer_state(new_state)

    def set_task(self, task):
        self.change_observer_state(False)
        old_motion = self.motion
        if old_motion:
            self.position = old_motion.position
            self.server.motions.remove(old_motion)
        super(Bot, self).set_task(task)
        new_motion = task if isinstance(task, tasks.Goto) else None
        self.motion = new_motion
        if new_motion:
            self.server.motions.append(new_motion)
        self.change_observer_state(True)

    def delete(self):
        motion = self.motion
        if motion:
            self.server.motions.remove(motion)
        super(Bot, self).delete()

