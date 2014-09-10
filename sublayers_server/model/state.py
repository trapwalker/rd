# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point
from si import kmh

from math import degrees, radians, pi


EPS = 1e-5

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
        cruise_control=0.0,
        turn_fctor=0,
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
        @param int turn_fctor: segment trajectory turning factor: 0 - forward; 1 - CCW; -1 - CCW
        """
        self.a_accelerate = a_accelerate
        self.a_braking = a_braking
        self.v_max = v_max
        self.r_min = r_min
        self.ac_max = ac_max
        assert ac_max > 0

        self.cruise_control = cruise_control
        self.turn_factor = turn_fctor
        self.t0 = t
        self.p0 = p
        self.fi0 = fi
        self.v0 = v
        assert v >= 0.0

        self.r = self.r_min if self.turn_factor else None
        self.c = (self.p0 + Point.polar(self.r, self.fi0 + self.turn_factor * pi / 2.0)) if self.turn_factor else None
        self.w0 = self.v0 / self.r if self.r else 0.0
        self.v_cc = self.v_max * self.cruise_control
        self.a = self.a_accelerate if self.v0 + EPS < self.v_cc else (
            self.a_braking if self.v0 - EPS > self.v_cc else 0.0
        )
        self.e = self.a / self.r
        self.t_max = None
        # todo: t_max calculation
        self.p = self.p_circular if self.turn_factor else self.p_linear

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
        return self.p0 + Point.polar(0.5 * self.a * dt ** 2 + self.v0 * dt, self.fi0)

    def p_circular(self, t):
        return self.c + Point.polar(self.r, self.fi(t))

    def update(self, t=None, dt=0.0, cruise_control=None, turn_factor=None):
        """
        @param float t: time (sec)
        @param float dt: delta time (sec)
        @param float cruise_control: Cruise speed ratio
        @param int turn_fctor: segment trajectory turning factor: 0 - forward; 1 - CCW; -1 - CCW
        """
        t = (self.t0 if t is None else t) + dt

        if t != self.t0:
            self.p0 = self.p(t)
            self.v0 = self.v(t)
            self.fi0 = self.fi(t)
            self.w0 = self.w(t)
            self.t0 = t

        self.p = self.p_circular if self.turn_factor else self.p_linear


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
