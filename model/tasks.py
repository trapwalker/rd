# -*- coding: utf-8 -*-

from math import sqrt

from abc import ABCMeta, abstractmethod
from Queue import PriorityQueue
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
        self.v = self.vector.normalize() * self.owner.max_velocity  # Velocity

    @staticmethod
    def _append_contacts(subj, obj, t0, a, k, c_wo_r2, contacts):
        """
        @param subj: base.VisibleObject
        @param obj: base.VisibleObject
        @param t0: utils.Time
        @param a: float
        @param k: float
        @c_wo_r2: float
        @param contacts: list
        """
        d4 = k ** 2 - a * (c_wo_r2 - subj.observer.r ** 2)
        if d4 > 0:
            d4 = sqrt(d4)
            t1 = (-k - d4) / a
            t2 = (-k + d4) / a
            if t1 >= t0:
                contacts.append(Contact(t1, subj, obj, KC_See if t1 <= t2 else KC_Unsee))
            if t2 >= t0:
                contacts.append(Contact(t2, subj, obj, KC_See if t2 < t1 else KC_Unsee))

    def contacts_with_static(self, static):
        """
        @param static: base.VisibleObject
        """
        # P(t)=V(t-t0)+P0
        # |P(t)-Q|=R
        p0 = self.start_point
        t0 = self.start_time
        v = self.v
        q = static.position
        # |V*t-V*t0+P0-Q|=R
        s = -v * t0 + p0 - q  # S=-V*t0+P0-Q; |V*t+S|=R
        # a*t^2+2*k*t+c=0; c=c_wo_r2-r^2
        a = v.x ** 2 + v.y ** 2
        k = v.x * s.x + v.y * s.y
        c_wo_r2 = s.x ** 2 + s.y ** 2

        contacts = []
        if self.owner.observer:
            self._append_contacts(self.owner, static, t0, a, k, c_wo_r2, contacts)
        if isinstance(static, Unit) and static.observer:
            self._append_contacts(static, self.owner, t0, a, k, c_wo_r2, contacts)
        return contacts

    def contacts_with_dynamic(self, motion):
        """
        @param motion: Goto
        """
        a0 = self.start_point
        va = self.v
        ta = self.start_time

        b0 = motion.start_point
        vb = motion.v
        tb = motion.start_time
        # | t*(va - vb) + vb*tb - va*ta + a0 - b0 | = r
        s = vb*tb - va*ta + a0 - b0
        v = va - vb  # | t*v + s | = r

        a = v.x ** 2 + v.y ** 2
        k = v.x * s.x + v.y * s.y
        c_wo_r2 = s.x ** 2 + s.y ** 2  # -r**2
        t0 = min(ta, tb)
        contacts = []
        if self.owner.observer:
            self._append_contacts(self.owner, motion.owner, t0, a, k, c_wo_r2, contacts)
        if motion.owner.observer:
            self._append_contacts(motion.owner, self.owner, t0, a, k, c_wo_r2, contacts)
        return contacts

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
