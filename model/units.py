# -*- coding: utf-8 -*-

from balance import BALANCE
from base import VisibleObject, Stationary
from observe import Observer
import tasks


class Unit(VisibleObject):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self, **kw):
        self.observer = Observer(self)
        super(Unit, self).__init__(**kw)

    # todo: tasks


class Station(Unit, Stationary):
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
        self.task = None
        self.set_task(self.default_task())

    def stop(self, done=False, next_task=None):
        self.set_task(next_task or self.default_task())
        # todo: need to review
        # todo: implement a strategy of behavior

    def goto(self, position):
        self.set_task(tasks.Goto(self.position, position))

    def default_task(self):
        return tasks.Stand(owner=self, position=self._position)

    def fix_position(self):
        self._position = self.position

    def set_task(self, task):
        self.fix_position()
        old_status = self.is_static()
        if self.task:
            self.task.unregister()
        self.task = task
        task.register()
        if old_status != self.is_static():
            if old_status:
                self.server.statics.remove(self)
                self.server.mobiles.append(self)
                if self.observer:
                    self.server.static_observers.remove(self)
            else:
                self.server.mobiles.remove(self)
                self.server.statics.append(self)
                if self.observer:
                    self.server.static_observers.append(self)


        # todo: remove task from server list

    def is_static(self):
        return not isinstance(self.task, tasks.Goto)

    def get_position(self):
        return self.task.position if self.task else self._position

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

