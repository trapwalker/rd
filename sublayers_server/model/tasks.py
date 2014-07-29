# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from math import sqrt
from abc import ABCMeta
from pprint import pformat

from events import ContactSee, ContactOut, TaskEnd
from utils import time_log_format
from base import Observer

DEFAULT_STANDING_DURATION = 60 * 60  # 1 hour
# todo: need review
# todo: server task list registration


class Task(object):
    __metaclass__ = ABCMeta
    __str_template__ = '<{self.__class__.__name__} in {self.start_time_str}'

    def __init__(self, owner, start_time=None):
        """
        @param model.units.Unit owner: Owner of task
        @param model.utils.TimeClass | None start_time: Time of task starting
        """
        super(Task, self).__init__()
        self.owner = owner
        self._get_time = owner.server.get_time
        self.start_time = start_time or self._get_time()

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self):
        # todo: suspend store serialization
        return dict(
            cls=self.classname,
            start_time=self.owner.server.get_time(),  # todo: Вынести публикацию времени для клиента из сериализации
        )

    def cancel(self):
        pass

    def __str__(self):
        return self.__str_template__.format(self=self)

    @property
    def start_time_str(self):
        return time_log_format(self.start_time)

    id = property(id)


class Determined(Task):

    def __init__(self, duration, **kw):
        """
        @param float duration: Duration of the task
        """
        super(Determined, self).__init__(**kw)
        self._duration = duration
        self.end_task_event = TaskEnd(time=self.finish_time, subj=self.owner)
        self.owner.server.post_event(self.end_task_event)

    @property
    def duration(self):
        """
        @rtype: float
        """
        return self._duration

    @property
    def finish_time(self):
        """
        @rtype: model.utils.TimeClass
        """
        return self.start_time + self.duration

    def cancel(self):
        self.end_task_event.actual = False


class Motion(Determined):
    __str_template__ = (
        '<{self.__class__.__name__} {self.start_time_str}: '
        '{self.start_point} -> {self.position} -> {self.target_point}; dt={self.duration}>'
    )

    def __init__(self, owner, **kw):
        """
        @param model.units.Bot owner: Owner of task
        @param model.vetors.Point target_point: Target point of motion
        """
        # todo: cut task with local quad square, store rest part of task
        # todo: GEO-index
        start_point = owner.position
        super(Motion, self).__init__(owner=owner, **kw)
        self.owner = owner  # todo: spike review
        self.start_point = start_point
        """@type: model.vectors.Point"""
        self.start_direction = owner.direction
        """@type: float"""

    @property
    def position(self, to_time=None):
        """
        @param model.utils.TimeClass | None to_time: Time for getting position
        @rtype: model.vectors.Point
        """
        return self.start_point

    @property
    def direction(self, to_time=None):
        """
        @param model.utils.TimeClass | None to_time: Time for getting direction
        @rtype: float
        """
        return self.start_direction


class Goto(Motion):

    def __init__(self, owner, target_point, **kw):
        """
        @param model.units.Bot owner: Owner of task
        @param model.vetors.Point target_point: Target point of motion
        """
        start_point = owner.position
        assert owner.max_velocity > 0
        duration = start_point.distance(target_point) / float(owner.max_velocity)
        super(Goto, self).__init__(owner=owner, duration=duration, **kw)
        assert self.start_point != target_point  # todo: epsilon test to eq
        self.target_point = target_point
        """@type: model.vectors.Point"""
        self.vector = self.target_point - self.start_point
        self.v = self.vector.normalize() * self.owner.max_velocity  # Velocity
        """@type: model.vectors.Point"""

    def as_dict(self):
        d = super(Goto, self).as_dict()
        d.update(
            velocity=self.v,
        )
        return d

    @staticmethod
    def _append_contacts(subj, obj, tmin, tmax, a, k, c_wo_r2, t0, contacts):
        """
        @param model.base.Observer subj: Subject of potential contacts
        @param model.base.VisibleObject obj: Object of potential contacts
        @param float tmin: Minimal possible time of potential contact
        @param float tmax: Maximal possible time of potential contact
        @param float a: First coefficient of polynome a*t^2+2*k*t+c=0
        @param float k:
        @param float c_wo_r2:
        @param float t0: Common reference time point
        @param list[ContactSee|ContactOut] contacts: Contact list
        """
        d4 = k ** 2 - a * (c_wo_r2 - subj.r ** 2)
        if d4 > 0:
            d4 = sqrt(d4)
            t1 = (-k - d4) / a + t0
            t2 = (-k + d4) / a + t0

            if tmin <= t1 <= tmax:
                contacts.append(ContactSee(time=t1, subj=subj, obj=obj))
            if tmin <= t2 <= tmax:
                contacts.append(ContactOut(time=t2, subj=subj, obj=obj))

    def contacts_with_static(self, static):
        """
        @param model.base.VisibleObject | model.units.Unit static: Static object
        """
        # P(t)=V(t)+P0  // t0 is start_time
        # |P(t)-Q|=R
        p0 = self.start_point
        tmin = self.start_time
        tmax = self.finish_time
        v = self.v
        """@type: model.vectors.Point"""
        q = static.position
        # |V*t+P0-Q|=R
        s = p0 - q  # S=P0-Q; |V*t+S|=R
        # a*t^2+2*k*t+c=0; c=c_wo_r2-r^2
        a = v.x ** 2 + v.y ** 2
        k = v.x * s.x + v.y * s.y
        c_wo_r2 = s.x ** 2 + s.y ** 2

        contacts = []
        self._append_contacts(self.owner, static, tmin, tmax, a, k, c_wo_r2, tmin, contacts)

        if isinstance(static, Observer):
            self._append_contacts(static, self.owner, tmin, tmax, a, k, c_wo_r2, tmin, contacts)
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

        # Use relative time for best accuracy
        t0 = ta
        ta = 0.0
        tb -= t0

        # | t*(va - vb) + vb*tb - va*ta + a0 - b0 | = r
        s = vb*tb - va*ta + a0 - b0  # todo: Remove multiplication by 0
        """@type: model.vectors.Point"""

        v = va - vb  # | t*v + s | = r
        """@type: model.vectors.Point"""

        a = v.x ** 2 + v.y ** 2
        k = v.x * s.x + v.y * s.y
        c_wo_r2 = s.x ** 2 + s.y ** 2  # -r**2
        tmin = max(ta, tb)
        tmax = min(self.finish_time, motion.finish_time)

        contacts = []
        self._append_contacts(self.owner, motion.owner, tmin, tmax, a, k, c_wo_r2, t0, contacts)
        self._append_contacts(motion.owner, self.owner, tmin, tmax, a, k, c_wo_r2, t0, contacts)

        return contacts

    @property
    def position(self, to_time=None):
        """
        @param model.utils.TimeClass | None to_time: Time for getting position
        @rtype: model.vectors.Point
        """
        to_time = to_time or self._get_time()
        return self.vector.normalize() * self.owner.max_velocity * (to_time - self.start_time) + self.start_point

    @property
    def direction(self, to_time=None):
        """
        @param model.utils.TimeClass | None to_time: Time for getting direction
        @rtype: float
        """
        return self.vector.angle


# todo: Make "Follow" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Scouting" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Goto" task modifiers (aggresive, sneaking, ...)
# todo: Make "Standing" task modifiers (aggresive, sneaking, defending, ...)
