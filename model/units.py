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

    def register(self, server):
        super(Unit, self).register(server)
        if self.observer:
            server.register_observer(self.observer)

    # todo: tasks


class Station(Unit, Stationary):
    u"""Class of buildings"""

    def __init__(self, **kw):
        super(Station, self).__init__(**kw)


class Bot(Unit):
    u"""Class of mobile units"""

    def __init__(self, **kw):
        super(Bot, self).__init__(**kw)
        self.set_task(self.default_task())

    def stop(self, done=False, next_task=None):
        self.fix_position()
        self.set_task(next_task or self.default_task())
        # todo: need to review
        # todo: implement a strategy of behavior

    def default_task(self):
        return tasks.Stand(owner=self, position=self._position)

    def fix_position(self):
        self._position = self.position

    def set_task(self, task):
        self.task = task
        # todo: remove task from server list

    def is_static(self):
        return isinstance(self.task, tasks.Stand)

    def get_position(self):
        return self.task.position

    @property
    def max_velocity(self):  # m/s
        return BALANCE.get_MaxVelocity(self)
