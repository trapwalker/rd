# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from math import sqrt
from abc import ABCMeta

from events import ContactSee, ContactOut, TaskEnd
from utils import time_log_format
from base import Observer
from vectors import Point
from trajectory import build_trajectory

DEFAULT_STANDING_DURATION = 60 * 60  # 1 hour
# todo: need review
# todo: server task list registration


class ETaskParamsUnactual(Exception):
    pass


class Task(object):
    __metaclass__ = ABCMeta
    __str_template__ = '<{self.__class__.__name__} in {self.start_time_str} [{self.status_str}]'

    def __init__(self, owner):
        """
        @param sublayers_server.model.units.Unit owner: Owner of task
        """
        super(Task, self).__init__()
        self.owner = owner
        self._get_time = owner.server.get_time
        self.start_time = None
        self.is_started = False
        self.is_cancelled = False
        self.is_done = False

    @property
    def status_str(self):
        return ''.join([
            'S' if self.is_started else 's',
            'C' if self.is_cancelled else 'c',
            'D' if self.is_done else 'd',
        ])

    @property
    def is_worked(self):
        return self.is_started and not self.is_cancelled and not self.is_done

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self):
        # todo: suspend store serialization
        return dict(
            cls=self.classname,
            start_time=self.start_time,
        )

    def motion_info(self, to_time):
        return dict(
            cls=self.classname,
            time=to_time,
        )

    def start(self, **kw):
        #log.debug('TASK start: %s', self)
        self.on_before_start(**kw)
        self.start_time = self._get_time()
        self.is_started = True
        self.on_after_start(**kw)

    def done(self, **kw):
        #log.debug('TASK done: %s', self)
        self.on_before_end(**kw)
        self.is_done = True
        self.on_after_end(**kw)
        self.owner.next_task()

    def cancel(self, **kw):
        #log.debug('TASK cancel: %s', self)
        #raise Exception('#############')
        self.on_before_end(**kw)
        self.is_cancelled = True
        self.on_after_end(**kw)
        self.owner.next_task()

    def on_before_start(self, **kw):
        pass

    def on_after_start(self, **kw):
        pass

    def on_before_end(self, **kw):
        pass

    def on_after_end(self, **kw):
        pass

    def __str__(self):
        return self.__str_template__.format(self=self)

    @property
    def start_time_str(self):
        if self.start_time is None:
            return "#N/A"
        return time_log_format(self.start_time)

    id = property(id)


class Determined(Task):

    def __init__(self, duration, **kw):
        """
        @param float duration: Duration of the task
        """
        super(Determined, self).__init__(**kw)
        self._duration = duration
        self.end_task_event = None

    def cancel(self, **kw):
        super(Determined, self).cancel(**kw)
        if self.end_task_event:
            self.end_task_event.cancel()

    def on_after_start(self, **kw):
        super(Determined, self).on_after_start(**kw)
        self.end_task_event = TaskEnd(time=self.finish_time, task=self)
        self.end_task_event.send()

    @property
    def duration(self):
        """
        @rtype: float
        """
        return self._duration

    @property
    def finish_time(self):
        """
        @rtype: float
        """
        return self.start_time + self.duration


class Motion(Determined):
    #__str_template__ = '<{self.__class__.__name__} {self.start_time_str}: '
    #'{self.start_point} -> {self.position} -> {self.target_point}; dt={self.duration}>'

    def __init__(self, **kw):
        """
        """
        # todo: cut task with local quad square, store rest part of task
        # todo: GEO-index
        super(Motion, self).__init__(**kw)
        self.start_point = None
        """@type: sublayers_server.model.vectors.Point | None"""
        self.start_direction = None
        """@type: float | None"""
        self.path = None

    def motion_info(self, to_time):
        d = super(Motion, self).motion_info(to_time)
        d.update(
            position=self.get_position(to_time),
            direction=self.get_direction(to_time),
            v=self.get_v(to_time),
            velocity=self.get_v(to_time),  # todo: remove or replace to scalar
            path=self.path,
            #direction_from_t='{k}*(t-{t0})+{d0}'.format(
            #    k=(self.get_direction(self.finish_time) - self.get_direction(to_time)) / self.duration,
            #    t0=to_time,
            #    d0=self.get_direction(to_time),
            #),
        )
        return d

    def on_before_start(self, **kw):
        super(Motion, self).on_before_start(**kw)
        self.start_point = self.owner.position  # todo: test variant
        self.start_direction = self.owner.direction

        self.owner.server.motions.append(self)
        self.owner.motion = self
        self.owner.server.statics.remove(self.owner)  # todo: Устранить лишнее переключение в статик при смене таска
        self.owner.server.static_observers.remove(self.owner)

    def on_after_start(self, **kw):
        super(Motion, self).on_after_start(**kw)
        self.owner.on_change()

    def on_before_end(self, **kw):
        self.owner.server.motions.remove(self)

    def on_after_end(self, **kw):
        t = self.finish_time if self.is_done else self._get_time()
        self.owner.position = self.get_position(t)
        self.owner.direction = self.get_direction(t)
        self.owner.motion = None

        self.owner.server.statics.append(self.owner)  # todo: Устранить лишнее переключение в статик при смене таска
        self.owner.server.static_observers.append(self.owner)
        super(Motion, self).on_after_end(**kw)
        self.owner.on_change()

    def get_position(self, to_time=None):
        """
        @param float | None to_time: Time for getting position
        @rtype: sublayers_server.model.vectors.Point
        """
        return self.start_point

    def get_direction(self, to_time=None):
        """
        @param float | None to_time: Time for getting direction
        @rtype: float
        """
        return self.start_direction

    def get_velocity(self, to_time=None):
        """
        @param float | None to_time: Time for getting direction
        @rtype: float
        """
        return self.owner.max_velocity  # todo: (!) Change to current bot velocity

    def get_v(self, to_time=None):
        """
        @param float | None to_time: Time for getting direction
        @rtype: sublayers_server.model.vectors.Point
        """
        return (Point(1) * self.get_velocity(to_time)).rotate(self.get_direction(to_time))

    position = property(get_position)
    direction = property(get_direction)
    velocity = property(get_velocity)
    v = property(get_v)


def goto(owner, target_point=None, path=None):
    owner.clear_tasks()
    if not path:
        path = build_trajectory(
            owner.position,
            owner.direction,
            owner.max_velocity,  # todo: current velocity fix
            target_point,
        )

    if path:
        segment = path.pop(0)
        if 'r' in segment:
            owner.set_tasklist([GotoArc(owner=owner, target_point=segment['b'], arc_params=segment, path=path)])
        else:
            owner.set_tasklist([Goto(owner=owner, target_point=segment['b'], path=path)])

    return path


class Goto(Motion):

    def __init__(self, target_point, path=None, **kw):
        """
        @param sublayers_server.model.vectors.Point target_point: Target point of motion
        """
        super(Goto, self).__init__(duration=None, **kw)
        self.target_point = target_point
        """@type: sublayers_server.model.vectors.Point"""
        self.vector = None
        """@type: sublayers_server.model.vectors.Point | None"""
        self._v = None
        """@type: sublayers_server.model.vectors.Point | None"""
        self.path = path

    def on_before_start(self, **kw):
        super(Goto, self).on_before_start(**kw)
        assert self.owner.max_velocity > 0
        self._duration = self.start_point.distance(self.target_point) / float(self.owner.max_velocity)
        self.vector = self.target_point - self.start_point
        if self.vector.is_zero():
            raise ETaskParamsUnactual('Target point is same as start point or too close: %s' % self.vector)
        self._v = self.vector.normalize() * self.owner.max_velocity  # Velocity

    def on_after_end(self, **kw):
        super(Goto, self).on_after_end(**kw)
        path = self.path
        if path and self.is_done:
            segment = path.pop(0)
            if 'r' in segment:
                next_task = GotoArc(owner=self.owner, target_point=segment['b'], arc_params=segment, path=path)
            else:
                next_task = Goto(owner=self.owner, target_point=segment['b'], path=path)
            self.owner.set_tasklist([next_task], append=True)

    def get_position(self, to_time=None):
        """
        @param float | None to_time: Time for getting position
        @rtype: sublayers_server.model.vectors.Point
        """
        to_time = to_time or self._get_time()
        return self.vector.normalize() * self.get_velocity(to_time) * (to_time - self.start_time) + self.start_point
        # todo: (!) acceleration

    def get_direction(self, to_time=None):
        """
        @param float | None to_time: Time for getting direction
        @rtype: float
        """
        return self.vector.angle

    def get_v(self, to_time=None):
        """
        @param float | None to_time: Time for getting direction
        @rtype: sublayers_server.model.vectors.Point
        """
        return self._v

    position = property(get_position)
    direction = property(get_direction)
    v = property(get_v)

    def as_dict(self):
        d = super(Goto, self).as_dict()
        d.update(
            velocity=self.v,
        )
        return d

    @staticmethod
    def _detect_and_register_contacts(subj, obj, tmin, tmax, a, k, c_wo_r2, t0):
        """
        @param sublayers_server.model.base.Observer subj: Subject of potential contacts
        @param sublayers_server.model.base.VisibleObject obj: Object of potential contacts
        @param float tmin: Minimal possible time of potential contact
        @param float tmax: Maximal possible time of potential contact
        @param float a: First coefficient of polynome a*t^2+2*k*t+c=0
        @param float k:
        @param float c_wo_r2:
        @param float t0: Common reference time point
        """
        d4 = k ** 2 - a * (c_wo_r2 - subj.r ** 2)
        if d4 > 0:
            d4 = sqrt(d4)
            t1 = (-k - d4) / a + t0
            t2 = (-k + d4) / a + t0
            if tmin <= t1 <= tmax:
                ContactSee(time=t1, subj=subj, obj=obj).send()
            if tmin <= t2 <= tmax:
                ContactOut(time=t2, subj=subj, obj=obj).send()

    def detect_contacts_with_static(self, static):
        """
        @param sublayers_server.model.base.VisibleObject | sublayers_server.model.units.Unit static: Static object
        """
        # P(t)=V(t)+P0  // t0 is start_time
        # |P(t)-Q|=R
        p0 = self.start_point
        tmin = self.start_time
        tmax = self.finish_time
        v = self.v
        """@type: sublayers_server.model.vectors.Point"""
        q = static.position
        # |V*t+P0-Q|=R
        s = p0 - q  # S=P0-Q; |V*t+S|=R
        # a*t^2+2*k*t+c=0; c=c_wo_r2-r^2
        a = v.x ** 2 + v.y ** 2
        k = v.x * s.x + v.y * s.y
        c_wo_r2 = s.x ** 2 + s.y ** 2

        self._detect_and_register_contacts(self.owner, static, tmin, tmax, a, k, c_wo_r2, tmin)

        if isinstance(static, Observer):
            self._detect_and_register_contacts(static, self.owner, tmin, tmax, a, k, c_wo_r2, tmin)

    def detect_contacts_with_dynamic(self, motion):
        """
        @param sublayers_server.model.tasks.Goto motion: Motion task of mobile unit
        """
        a0 = self.start_point
        va = self.v
        ta = self.start_time

        b0 = motion.start_point
        vb = motion.v
        tb = motion.start_time

        tmin = max(ta, tb)
        tmax = min(self.finish_time, motion.finish_time)

        # Use relative time for best accuracy
        t0 = ta
        ta = 0.0
        tb -= t0

        # | t*(va - vb) + vb*tb - va*ta + a0 - b0 | = r
        s = vb*tb - va*ta + a0 - b0  # todo: Remove multiplication by 0
        """@type: sublayers_server.model.vectors.Point"""

        v = va - vb  # | t*v + s | = r
        """@type: sublayers_server.model.vectors.Point"""

        a = v.x ** 2 + v.y ** 2
        k = v.x * s.x + v.y * s.y
        c_wo_r2 = s.x ** 2 + s.y ** 2  # -r**2

        self._detect_and_register_contacts(self.owner, motion.owner, tmin, tmax, a, k, c_wo_r2, t0)
        self._detect_and_register_contacts(motion.owner, self.owner, tmin, tmax, a, k, c_wo_r2, t0)


class GotoArc(Goto):
    def __init__(self, arc_params, **kw):
        super(GotoArc, self).__init__(**kw)
        self.arc_params = arc_params

    def motion_info(self, to_time):
        d = super(GotoArc, self).motion_info(to_time)
        d.update(arc=self.arc_params, cls='Goto')  # todo: cls hack remove
        return d

    def get_direction(self, to_time=None):
        """
        @param float | None to_time: Time for getting direction
        @rtype: float
        """
        if to_time is None:
            to_time = self._get_time()
        return (
            self.vector.angle +
            (self.vector.angle - self.start_direction) * (to_time - self.start_time) / self.duration
        )

    direction = property(get_direction)

# todo: Make "Follow" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Scouting" task +modifiers (aggresive, sneaking, defending, ...)
# todo: Make "Goto" task modifiers (aggresive, sneaking, ...)
# todo: Make "Standing" task modifiers (aggresive, sneaking, defending, ...)
