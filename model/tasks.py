# -*- coding: utf-8 -*-

from abc import ABCMeta, abstractmethod

from utils import get_time


class Task(object):

    __metaclass__ = ABCMeta

    def __init__(self, owner, start_time=None, **kw):
        super(Task, self).__init__(**kw)
        self.owner = owner
        self.start_time = start_time or get_time()

    @abstractmethod
    def get_duration(self):
        pass

    duration = property(get_duration)

    @property
    def finish_time(self):
        return self.start_time + self.duration


class Moving(Task):

    def __init__(self, **kw):
        super(Moving, self).__init__(**kw)

    @abstractmethod
    def get_position(self):
        pass


class Goto(Task):

    def __init__(self, start_point, target_point, **kw):
        # todo: declare arg types
        assert start_point != target_point # todo: epsilon test to eq
        super(Goto, self).__init__(**kw)
        self.start_point = start_point
        self.target_point = target_point

        self._vector = self.target_point - self.start_point

    def get_duration(self):
        assert self.owner.max_velocity != 0
        return self.start_point.distance(self.target_point) / float(self.owner.max_velocity)

    def get_position(self, to_time=None):
        to_time = to_time or get_time()
        return self._vector.normalize() * self.owner.max_velocity * (to_time - self.start_time)



