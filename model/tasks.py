# -*- coding: utf-8 -*-

from abc import ABCMeta, abstractmethod
from functools import total_ordering
from Queue import PriorityQueue

from utils import get_time


DEFAULT_STANDING_DURATION = 60 * 60  # 1 hour
# todo: need review
# todo: server task list registration


class Task(object):
    __metaclass__ = ABCMeta
    __slots__ = ['__weakref__', 'owner', 'start_time', 'events', '_position', '_duration']

    def __init__(self, owner, start_time=None):
        super(Task, self).__init__()
        self.owner = owner
        self.start_time = start_time or get_time()
        self.events = PriorityQueue()
        # todo: calculate early event time

    def register(self):
        self.owner.server.register_task(self)

    def unregister(self):
        self.owner.server.unregister_task(self)

    def cancel(self):
        self.unregister()

    def done(self):
        self.unregister()

    @abstractmethod
    def get_position(self):
        return None

    @abstractmethod
    def get_duration(self):
        return None

    position = property(get_position)
    duration = property(get_duration)

    @property
    def finish_time(self):
        return self.start_time + self.duration


class Stand(Task):
    __slots__ = []

    def __init__(self, position, duration=DEFAULT_STANDING_DURATION, **kw):
        # todo: declare arg types
        super(Stand, self).__init__(**kw)
        self._position = position
        self._duration = duration

    def get_position(self, to_time=None):
        return self._position

    def get_duration(self):
        return self._duration


class Goto(Task):
    __slots__ = ['start_point', 'target_point', 'vector']

    def __init__(self, target_point, **kw):
        # todo: declare arg types
        start_point = self.owner.position
        assert start_point != target_point  # todo: epsilon test to eq
        super(Goto, self).__init__(**kw)
        self.start_point = start_point
        self.target_point = target_point
        self.vector = target_point - start_point

    def get_position(self, to_time=None):
        to_time = to_time or get_time()
        return self.vector.normalize() * self.owner.max_velocity * (to_time - self.start_time)

    def get_duration(self):
        assert self.owner.max_velocity != 0
        return self.start_point.distance(self.target_point) / float(self.owner.max_velocity)


# todo: Make "Follow" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Scouting" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Goto" task modifiers (aggresive, sneaking, ...)
# todo: Make "Standing" task modifiers (aggresive, sneaking, defending, ...)
