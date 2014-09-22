# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point
#from si import kmh

from math import degrees, radians, pi, sqrt


EPS = 1e-5


class ETimeIsNotInState(Exception):
    pass


def assert_time_in_state(f):
    # todo: make metadata covering
    def cover(self, t=None, *av, **kw):
        if self.t_max is not None and t is not None and t > self.t_max:
            raise ETimeIsNotInState('Time {} given, but {} is last in this state'.format(t, self.t_max))
        return f(self, t=t, *av, **kw)

    return cover


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
        cc=0.0,
        turn=0,
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
        @param float cc: Cruise speed ratio
        @param int turn: segment trajectory turning factor: 0 - forward; 1 - CCW; -1 - CCW
        """
        self.a_accelerate = a_accelerate
        self.a_braking = a_braking
        self.v_max = v_max
        self.r_min = r_min
        self.ac_max = ac_max
        assert ac_max > 0

        self.cc = 0.0
        self.turn = 0
        self.t0 = t
        self.p0 = p
        self.fi0 = fi
        self.v0 = v
        assert v >= 0.0

        self.v_cc = 0.0
        self.t_max = None
        self.p = self.p_linear
        self.r = None
        self.c = None
        self.w0 = 0.0
        self.e = 0.0
        self.a = 0.0
        self.update(cc=cc, turn=turn)

    @assert_time_in_state
    def update(self, t=None, dt=0.0, cc=None, turn=None):
        """
        @param float t: time (sec)
        @param float dt: delta time (sec)
        @param float cc: Cruise speed ratio
        @param int turn: segment trajectory turning factor: 0 - forward; 1 - CCW; -1 - CCW
        """
        t = (self.t0 if t is None else t) + dt

        if t != self.t0:
            self.p0 = self.p(t)
            self.v0 = self.v(t)
            self.fi0 = self.fi(t)
            self.w0 = self.w(t)
            self.t0 = t

        if cc is not None:
            self.cc = cc

        if turn is not None:
            self.turn = turn

        self.v_cc = self.v_max * self.cc
        self.t_max = None
        target_v = self.v_cc

        if self.turn:
            self.p = self.p_circular
            self.r = self.v0 ** 2 / self.ac_max
            self.c = (self.p0 + Point.polar(self.r, self.fi0 + self.turn * pi / 2.0))
            self.w0 = self.v0 / self.r
            if self.r < self.r_min:
                self.r = self.r_min
                target_v = min(target_v, sqrt(self.r * self.ac_max))
            else:
                target_v = min(target_v, self.v0)
        else:
            self.p = self.p_linear
            self.r = None
            self.c = None
            self.w0 = 0

        dv = target_v - self.v0
        if dv > EPS:
            self.a = self.a_accelerate
        elif dv < -EPS:
            self.a = self.a_braking
        else:
            self.a = 0.0

        if self.a:
            self.t_max = self.t0 + dv / self.a

        if self.turn:
            self.e = self.a / self.r

    def as_dict(self):
        return dict(
            self.__dict__,
        )

    def __str__(self):
        return (
            '<t=[{t0:.2f}-{t_max_str}];'
            ' p=[{p0.x:.1f}, {p0.y:.1f}];'
            ' fi={fi_deg:.0f};'
            ' v={v0:.0f};'
            ' a={a:.0f};'
            ' w={w_deg:.0f};'
            ' e={e_deg:.0f};'
            ' turn={turn};'
            ' cc={cc_percent:.0f}% ({v_cc:.0f}m/s)>'
        ).format(
            fi_deg=degrees(self.fi0),
            w_deg=degrees(self.w0),
            e_deg=degrees(self.e),
            cc_percent=self.cc * 100,
            t_max_str='{:.2f}'.format(self.t_max) if self.t_max is not None else '',
            **self.__dict__
        )

    @assert_time_in_state
    def v(self, t):
        return self.v0 + self.a * (t - self.t0)

    @assert_time_in_state
    def w(self, t):
        return (self.v(t) / self.r) if self.r else 0.0

    @assert_time_in_state
    def fi(self, t):
        if self.turn == 0:
            return self.fi0

        dt = t - self.t0
        return self.fi0 + (0.5 * self.a * dt ** 2 + self.v0 * dt) / self.r

    @assert_time_in_state
    def p_linear(self, t):
        dt = t - self.t0
        return self.p0 + Point.polar(0.5 * self.a * dt ** 2 + self.v0 * dt, self.fi0)

    @assert_time_in_state
    def p_circular(self, t):
        return self.c + Point.polar(self.r, self.fi(t) + self.turn * pi * 0.5)


if __name__ == '__main__':
    import thread
    g = 1
    def lookup(state):
        from sys import stderr
        from time import sleep
        global g
        g = 1
        while g:
            try:
                state.update(dt=1.0)
            except ETimeIsNotInState as e:                
                print >>stderr, e.message
                state.update(t=state.t_max)
            print >>stderr, state
            sleep(1)

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
    print 'START:', s
    thread.start_new(lookup, (s,))

