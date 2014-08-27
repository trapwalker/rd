# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point

from math import degrees, radians


class State(object):

    def __init__(self, t, p, fi=0.0, v=0.0, a=0.0, w=0.0, e=0.0):
        """
        @param float t: time (sec)
        @param Point p: position (m)
        @param float fi: direction (rad)
        @param float v: velocity (m/s)
        @param float a: linear acceleration (m/s**2)
        @param float w: angular velocity (rad/s)
        @param float e: angular acceleration (rad/s**2)
        """
        self.t0 = t
        self.p0 = p
        self.fi0 = fi
        self.v0 = v
        self.a = a
        self.w0 = w
        self.e = e
        self.p = self.p_circular if self.is_circular else self.p_linear

    def as_dict(self):
        return dict(
            self.__dict__,
            is_circular=self.is_circular,
            r0=self.r(self.t0),
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
            ' r={r0}>'
        ).format(
            fi_deg=degrees(self.fi0),
            w_deg=degrees(self.w0),
            e_deg=degrees(self.e),
            r0=self.r(self.t0),
            **self.__dict__
        )

    def r(self, t):
        w = self.w(t)
        if w == 0:
            return float('inf')
        return self.v(t) / w

    def w(self, t):
        return self.w0 + self.e * (t - self.t0)

    def fi(self, t):
        return self.fi0 + self.w(t) * (t - self.t0)

    def v(self, t):
        return self.v0 + self.a * (t - self.t0)

    @property
    def is_circular(self):
        return self.w0 != 0.0 or self.e != 0.0

    def p_linear(self, t):
        return self.p0 + Point.polar(self.v(t) * (t - self.t0), self.fi(t))

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
