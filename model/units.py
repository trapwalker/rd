# -*- coding: utf-8 -*-

from balance import BALANCE
from base import VisibleObject
from observe import Observer
import tasks


class Unit(VisibleObject):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self, **kw):
        super(Unit, self).__init__(**kw)
        self._observer = None
        self.task = self.default_task()

    def default_task(self):
        return None

    def get_task(self):
        return self._task

    def set_task(self, task):
        del(self.task)
        self._task = task
        if task:
            task.register()

    def del_task(self):
        if hasattr(self, '_task') and self._task:
            self._task.unregister()
        self._task = None

    task = property(fget=get_task, fset=set_task, fdel=del_task)


class Station(Unit):
    u"""Class of buildings"""

    def __init__(self, **kw):
        super(Station, self).__init__(**kw)

    def register(self):
        super(Station, self).register()
        if self.observer:
            self.server.static_observers.append(self)

    def unregister(self):
        super(Station, self).unregister()
        if self.observer:
            self.server.static_observers.remove(self)


class Bot(Unit):
    u"""Class of mobile units"""

    def __init__(self, **kw):
        super(Bot, self).__init__(**kw)
        self.motion = None

    def stop(self, done=False, next_task=None):
        self.set_task(next_task or self.default_task())
        # todo: need to review
        # todo: implement a strategy of behavior

    def goto(self, position):
        self.set_task(tasks.Goto(self.position, position))

    def get_position(self):
        return self.motion.position if self.motion else self._position

    @property
    def max_velocity(self):  # m/s
        return BALANCE.get_MaxVelocity(self)

    def register(self):
        super(Bot, self).register()
        if self.is_static():
            self.server.statics.append(self)
            if self.observer:
                self.server.static_observers.append(self)
        else:
            self.server.mobiles.append(self)

    def unregister(self):
        super(Bot, self).unregister()
        if self.is_static():
            self.server.statics.remove(self)
            if self.observer:
                self.server.static_observers.remove(self)
        else:
            self.server.mobiles.remove(self)

