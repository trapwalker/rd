﻿# -*- coding: utf-8 -*-

from math import sqrt

from abc import ABCMeta, abstractmethod
from Queue import PriorityQueue
from vectors import Point
from utils import get_time
from units import Unit
from contacts import Contact, KC_See, KC_Unsee

DEFAULT_STANDING_DURATION = 60 * 60  # 1 hour
# todo: need review
# todo: server task list registration


class Task(object):
    __metaclass__ = ABCMeta
    __slots__ = ['__weakref__', 'owner', 'start_time', 'events', '_duration']

    def __init__(self, owner, start_time=None):
        """
        @param owner: units.Unit
        @param start_time: utils.Time | None
        """
        super(Task, self).__init__()
        self.owner = owner
        self.start_time = start_time or get_time()
        self.events = PriorityQueue()
        # todo: calculate early event time

    @abstractmethod
    def get_duration(self):
        """
        @rtype: float
        """
        return None

    duration = property(get_duration)

    @property
    def finish_time(self):
        """
        @rtype: utils.Time
        """
        return self.start_time + self.duration


class Goto(Task):
    __slots__ = ['start_point', 'target_point', 'vector', 'v']

    def __init__(self, target_point, **kw):
        """
        @param target_point: vetors.Point
        """
        # todo: declare arg types
        # todo: cut task with local quad square, store rest part of task
        # todo: GEO-index
        start_point = self.owner.position
        assert start_point != target_point  # todo: epsilon test to eq
        super(Goto, self).__init__(**kw)
        self.start_point = start_point
        self.target_point = target_point
        self.vector = target_point - start_point
        self.v = self.vector.normalize() * self.owner.max_velocity

    def contacts_with_static(self, static):
        """
        @param static: base.VisibleObject
        """
        start = self.start_point
        vector = self.vector
        v = self.v

        u = Point(v.x * vector.x,
                  v.y * vector.y)

        a = u.x ** 2 + u.y ** 2
        k = u.x * start.x + u.y * start.y

        contacts = []

        if self.owner.observer:
            self._contacts_with_static_roots(self.owner, static, start, a, k, contacts)
        if isinstance(static, Unit) and static.observer:
            self._contacts_with_static_roots(static, self.owner, start, a, k, contacts)
        return contacts

    def _contacts_with_static_roots(self, subj, obj, start, a, k, contacts):
        t0 = self.start_time
        c = start.x ** 2 + start.y ** 2 - subj.observer.r
        d4 = k ** 2 - a * c
        if d4 > 0:  # todo: epsilon
            d4 = sqrt(d4)
            t1 = (-k - d4) / a
            t2 = (-k + d4) / a
            if t1 >= 0:  # todo: epsilon
                contacts.append(Contact(t0 + t1, subj, obj, KC_See if t1 <= t2 else KC_Unsee))
            if t2 >= 0:  # todo: epsilon
                contacts.append(Contact(t0 + t2, subj, obj, KC_See if t2 < t1 else KC_Unsee))

    def contacts_with_dynamic(self, motion):
        """
        @param motion: Goto
        """
        return []  # todo: realize

    def get_duration(self):
        """
        @rtype: float
        """
        assert self.owner.max_velocity != 0
        return self.start_point.distance(self.target_point) / float(self.owner.max_velocity)

    def get_position(self, to_time=None):
        """
        @param to_time: utils.Time } None
        """
        to_time = to_time or get_time()
        return self.vector.normalize() * self.owner.max_velocity * (to_time - self.start_time)

    position = property(get_position)


# todo: Make "Follow" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Scouting" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Goto" task modifiers (aggresive, sneaking, ...)
# todo: Make "Standing" task modifiers (aggresive, sneaking, defending, ...)
