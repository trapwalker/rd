# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point
from si import kmh

from math import degrees, radians


class State(object):

    def __init__(
        self, t, p,
        fi=0.0,
        v=0.0,
        r_min=5.0,    # m
        v_max=28.0,   # m/s ~ 100km/h
        ac_max=10.0,  # m/s^2 ~ 1g
        a_accelerate=5.0,
        a_braking=-10.0,
        cruise_control=0.8,
    ):
        """
        @param float t: time (sec)
        @param Point p: position (m)
        @param float fi: direction (rad)
        @param float v: velocity (m/s)
        @param float r_min: minimal turning radius (m)
        @param float v_max: maximal possible velocity (m/s)
        @param float ac_max: maximal centripetal acceleration (m/s**2)
        @param float a_accelerate: typical acceleration (m/s**2)
        @param float a_braking: typical braking (m/s**2)
        @param float cruise_control: Cruise speed ratio
        """
        self.a_accelerate = a_accelerate
        self.a_braking = a_braking
        self.v_max = v_max
        self.r_min = r_min
        self.ac_max = ac_max
        assert ac_max > 0

        self.cruise_control = cruise_control
        self.turn_factor = 0  # 0 - forward; 1 - CCW; -1 - CCW
        self.t0 = t
        self.p0 = p
        self.fi0 = fi
        self.v0 = v
        assert v >= 0.0

        self.a = 0.0
        self.w0 = 0.0
        self.e = 0.0
        self.p = self.p_circular if self.turn_factor else self.p_linear
        self.r = None

    def as_dict(self):
        return dict(
            self.__dict__,
        )

    def __str__(self):
        return (
            '<t={t0:.2f};'
            ' p=[{p0.x:.1f}, {p0.y:.1f}];'
            ' fi={fi_deg:.0f};'
            ' v={v0:.0f};'
            ' a={a:.0f};'
            ' w={w_deg:.0f};'
            ' e={e_deg:.0f};'
            ' turn={turn_factor};'
            ' cc={cc:.0f}% ({ccv:.0f}m/s)>'
        ).format(
            fi_deg=degrees(self.fi0),
            w_deg=degrees(self.w0),
            e_deg=degrees(self.e),
            cc=self.cruise_control * 100,
            ccv=self.v_max * self.cruise_control,
            **self.__dict__
        )

    def v(self, t):
        return self.v0 + self.a * (t - self.t0)

    def w(self, t):
        return (self.v(t) / self.r) if self.r else 0.0

    def fi(self, t):
        if self.turn_factor == 0:
            return self.fi0

        dt = t - self.t0
        return self.fi0 + (0.5 * self.a * dt ** 2 + self.v0 * dt) / self.r

    def p_linear(self, t):
        dt = t - self.t0
        # todo: fixit
        return self.p0 + Point.polar(self.v(t) * dt, self.fi(t))

    def p_circular(self, t):
        return self.p0 + Point.polar(self.v(t) * (t - self.t0), self.fi(t))

    def to_time(self, t):
        return self.__class__(
            t=t,
            p=self.p(t),
            fi=self.fi(t),
            v=self.v(t),
            a=self.a,
            w=self.w(t),
            e=self.e,
        )

    def update(self, t=None, dt=0.0, p=None, fi=None, v=None, a=None, w=None, e=None):
        """
        @param float t: time (sec)
        @param float dt: delta time (sec)
        @param Point p: position (m)
        @param float fi: direction (rad)
        @param float v: velocity (m/s)
        @param float a: linear acceleration (m/s**2)
        @param float w: angular velocity (rad/s)
        @param float e: angular acceleration (rad/s**2)
        """
        t = (self.t0 if t is None else t) + dt

        if t != self.t0:
            self.p0 = self.p(t)
            self.v0 = self.v(t)
            self.fi0 = self.fi(t)
            self.w0 = self.w(t)
            self.t0 = t

        if p is not None:
            self.p0 = p

        if fi is not None:
            self.fi0 = fi
            
        if v is not None:
            self.v0 = v
            
        if w is not None:
            self.w0 = w
            
        if a is not None:
            self.a = a

        if e is not None:
            self.e = e

        self.p = self.p_circular if self.is_circular else self.p_linear


if __name__ == '__main__':
    def u(*av, **kw):
        if 'fi' in kw:
            kw['fi'] = radians(kw['fi'])
        if 'w' in kw:
            kw['w'] = radians(kw['w'])
        if 'e' in kw:
            kw['e'] = radians(kw['e'])
        s.update(*av, **kw)
        print s
    
    s = State(0.0, Point(0))
    print s
