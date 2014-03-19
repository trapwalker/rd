# -*- coding: utf-8 -*-

from math import sqrt

from abc import ABCMeta, abstractmethod
from utils import get_time
from units import Unit, Bot
from contacts import Contact, KC_See, KC_Unsee


DEFAULT_STANDING_DURATION = 60 * 60  # 1 hour
# todo: need review
# todo: server task list registration


class Task(object):
    __metaclass__ = ABCMeta
    __slots__ = ['__weakref__', 'owner', 'start_time', '_duration']

    def __init__(self, owner, start_time=None):
        """
        @param Unit owner: Owner of task
        @param model.utils.TimeClass | None start_time: Time of task starting
        """
        super(Task, self).__init__()
        self.owner = owner
        self.start_time = start_time or get_time()

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
        @rtype: model.utils.TimeClass
        """
        return self.start_time + self.duration


class Goto(Task):
    __slots__ = ['start_point', 'target_point', 'vector', 'v']

    def __init__(self, owner, target_point, **kw):
        """
        @param Bot owner: Owner of task
        @param model.vetors.Point target_point: Target point of motion
        """
        # todo: cut task with local quad square, store rest part of task
        # todo: GEO-index
        start_point = self.owner.position
        assert start_point != target_point  # todo: epsilon test to eq
        super(Goto, self).__init__(owner=owner, **kw)
        assert isinstance(owner, Bot)
        self.owner = owner  # todo: spike review
        self.start_point = start_point
        self.target_point = target_point
        self.vector = target_point - start_point
        self.v = self.vector.normalize() * self.owner.max_velocity  # Velocity
        """@type: model.vectors.Point"""

    @staticmethod
    def _append_contacts(subj, obj, tmin, tmax, a, k, c_wo_r2, contacts):
        """
        @param model.units.Unit subj: Subject of potential contacts
        @param model.base.VisibleObject obj: Object of potential contacts
        @param float tmin: Minimal possible time of potential contact
        @param float tmax: Maximal possible time of potential contact
        @param float a: First coefficient of polynome a*t^2+2*k*t+c=0
        @param float k:
        @param float c_wo_r2:
        @param list[Contact] contacts: Contact list
        """
        d4 = k ** 2 - a * (c_wo_r2 - subj.observer.r ** 2)
        if d4 > 0:
            d4 = sqrt(d4)
            t1 = (-k - d4) / a
            t2 = (-k + d4) / a
            if tmin <= t1 <= tmax:
                contacts.append(Contact(t1, subj, obj, KC_See if t1 <= t2 else KC_Unsee))
            if tmin <= t2 <= tmax:
                contacts.append(Contact(t2, subj, obj, KC_See if t2 < t1 else KC_Unsee))

    def contacts_with_static(self, static):
        """
        @param model.base.VisibleObject static: Static object
        """
        # P(t)=V(t-t0)+P0
        # |P(t)-Q|=R
        p0 = self.start_point
        tmin = self.start_time
        tmax = self.finish_time
        v = self.v
        """@type: model.vectors.Point"""
        q = static.position
        # |V*t-V*t0+P0-Q|=R
        s = -v * tmin + p0 - q  # S=-V*t0+P0-Q; |V*t+S|=R
        # a*t^2+2*k*t+c=0; c=c_wo_r2-r^2
        a = v.x ** 2 + v.y ** 2
        k = v.x * s.x + v.y * s.y
        c_wo_r2 = s.x ** 2 + s.y ** 2

        contacts = []
        if self.owner.observer:
            self._append_contacts(self.owner, static, tmin, tmax, a, k, c_wo_r2, contacts)
        if isinstance(static, Unit):
            if static.observer:
                self._append_contacts(static, self.owner, tmin, tmax, a, k, c_wo_r2, contacts)
        return contacts

    def contacts_with_dynamic(self, motion):
        """
        @param model.tasks.Goto motion: Motion task of mobile unit
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
        tmin = max(ta, tb)
        tmax = min(self.finish_time, motion.finish_time)

        contacts = []
        if self.owner.observer:
            self._append_contacts(self.owner, motion.owner, tmin, tmax, a, k, c_wo_r2, contacts)
        if motion.owner.observer:
            self._append_contacts(motion.owner, self.owner, tmin, tmax, a, k, c_wo_r2, contacts)
        return contacts

    def get_duration(self):
        """
        @rtype: float
        """
        assert self.owner.max_velocity > 0
        return self.start_point.distance(self.target_point) / float(self.owner.max_velocity)

    def get_position(self, to_time=None):
        """
        @param model.utils.TimeClass | None to_time: Time for getting position
        @rtype: model.vectors.Point
        """
        to_time = to_time or get_time()
        return self.vector.normalize() * self.owner.max_velocity * (to_time - self.start_time)

    position = property(get_position)


# todo: Make "Follow" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Scouting" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Goto" task modifiers (aggresive, sneaking, ...)
# todo: Make "Standing" task modifiers (aggresive, sneaking, defending, ...)
