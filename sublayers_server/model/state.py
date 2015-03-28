# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.vectors import Point, normalize_angle
from math import pi, sqrt, log as ln, acos


EPS = 1e-5


class ETimeIsNotInState(Exception):
    pass


def assert_time_in_state(f):
    from functools import update_wrapper
    # todo: make metadata coveringx

    def cover(self, t=None, *av, **kw):
        if self.t_max is not None and t is not None and not (self.t0 <= t <= self.t_max):
        #if self.t_max is not None and t is not None and (((self.t0 - t) > EPS) or (t - self.t_max) > EPS):
            raise ETimeIsNotInState('Time {} given, but {} is last in this state and t0 is {}'.format(t, self.t_max, self.t0))
        return f(self, t=t, *av, **kw)

    return update_wrapper(cover, f)


class BaseMotionState(object):

    def __init__(self, t, p, fi=0.0, r_min=10.0, ac_max=10.0):
        self.t0 = t
        self.p0 = p
        self.fi0 = fi
        self.r_min = r_min
        self.ac_max = ac_max
        self.v0 = 0.0
        self.a = 0.0
        self._c = None
        self._turn_sign = 0.0
        self._sp_m = 0.0
        self._sp_fi0 = 0.0
        self._rv_fi = 0.0

    def fix(self, t=None, dt=0.0):
        t = (self.t0 if t is None else t) + dt
        if t != self.t0:
            self.p0 = self.p(t)
            self.fi0 = self.fi(t)
            self.v0 = self.v(t)
            self.t0 = t

    def s(self, t):
        dt = t - self.t0
        return self.v0 * dt + 0.5 * self.a * (dt ** 2)

    def v(self, t):
        dt = t - self.t0
        temp_v = self.v0 + self.a * dt
        if abs(temp_v) < EPS:
            temp_v = 0.0
        return temp_v

    def r(self, t):
        if self.a == 0:
            return (self.v0 ** 2) / self.ac_max + self.r_min  # круг
        return (self.v(t) ** 2) / self.ac_max + self.r_min  # спираль

    def sp_fi(self, t):
        assert self._sp_m > 0
        return ln(self.r(t) / self.r_min) / self._sp_m

    def fi(self, t):
        if self._c is None:
            return self.fi0
        if self.a == 0.0:
            return self.fi0 - self.s(t) / self.r(t) * self._turn_sign  # круг
        if self.a > 0.0:
            return self.fi0 - (self.sp_fi(t) - self._sp_fi0) * self._turn_sign  # спираль (а > 0)
        else:
            return normalize_angle(self.fi0 - (self.sp_fi(t) - self._sp_fi0) * self._turn_sign + pi)  # спираль (а < 0)

    def _fi(self, t):
        if self._c is None:
            return self.fi0
        if self.a == 0.0:
            return self.fi0 - self.s(t) / self.r(t) * self._turn_sign  # круг
        return self.fi0 - (self.sp_fi(t) - self._sp_fi0) * self._turn_sign  # спираль

    def p(self, t):
        if self._c is None:
            return self.p0 + Point.polar(self.s(t), self.fi0)
        return self._c + Point.polar(self.r(t), self._fi(t) + self._turn_sign * self._rv_fi)

    def export(self):
        return dict(
            cls='MobileState',
            t0=self.t0,
            p0=self.p0,
            fi0=self.fi0,
            v0=self.v0,
            a=self.a,
            c=self._c,
            turn=self._turn_sign,
            ac_max=self.ac_max,
            r_min=self.r_min,
            _sp_m=self._sp_m,
            _sp_fi0=self._sp_fi0,
            _rv_fi=self._rv_fi,
        )

    @property
    def is_moving(self):
        return (abs(self.v0) > 0.0) or (abs(self.a) > 0.0)


class MotionState(BaseMotionState):

    def __init__(
        self, t, p, fi=0.0,
        r_min=10.0,
        ac_max=20.0,
        v_forward=30.0,
        v_backward=-30.0,
        a_forward=4.0,
        a_backward=-2.0,
        a_braking=-9.0,
    ):
        super(MotionState, self).__init__(t=t, p=p, fi=fi, r_min=r_min, ac_max=ac_max)
        half_ac_max = 0.5 * self.ac_max
        assert (a_forward < half_ac_max) and (a_backward < half_ac_max) and (a_braking < half_ac_max)
        assert (v_forward >= 0.0) and (v_backward <= 0.0)
        self.v_forward = v_forward
        self.v_backward = v_backward
        self.a_forward = a_forward
        self.a_backward = a_backward
        self.a_braking = a_braking
        self.cc = 0.0
        self.turn = 0.0
        self.t_max = None
        self.target_point = None
        self.u_cc = None
        self.update()

    def _get_turn_sign(self, target_point):
        assert target_point is not None
        pt = target_point - self.p0
        pf = Point.polar(1, self.fi(self.t0))
        _turn_sign = pf.cross_mul(pt)
        if _turn_sign == 0.0:
            return 0.0 if pf.angle_with(pt) == 0.0 else 1
        if self.v0 < 0.0:
            _turn_sign = -_turn_sign
        return 1 if _turn_sign > 0.0 else -1

    def _get_turn_fi(self, target_point):
        assert target_point is not None
        turn_sign = self._get_turn_sign(target_point=target_point)
        if turn_sign == 0.0:
            return 0.0
        r = self.r(self.t0)
        if self.v0 > 0.0:
            c = self.p0 + Point.polar(r, self.fi(self.t0) + turn_sign * 0.5 * pi)
        else:
            c = self.p0 + Point.polar(r, self.fi(self.t0) - turn_sign * 0.5 * pi)
        cp = self.p0 - c
        ct = target_point - c
        ct_angle = ct.angle
        ce_fi = ct_angle - turn_sign * acos(r / abs(ct))
        if ce_fi < - pi:
            ce_fi += 2 * pi
        if ce_fi > pi:
            ce_fi -= 2 * pi
        res = ce_fi - cp.angle
        if turn_sign < 0:
            res = 2 * pi - res
        return normalize_angle(res)

    @assert_time_in_state
    def update(self, t=None, dt=0.0, cc=None, turn=None):
        self.fix(t=t, dt=dt)
        self.t_max = None

        if cc is not None:
            if abs(cc) < EPS:
                cc = 0.0
            assert -1 <= cc <= 1
            assert (cc == 0.0) or ((cc > 0.0) and (self.v0 >= 0.0)) or ((cc < 0.0) and (self.v0 <= 0.0)), \
                'cc={}  v0={}'.format(cc, self.v0)
            self.cc = cc
        assert self.cc is not None

        v_max = self.v_forward if self.cc >= 0 else self.v_backward
        dv = v_max * abs(self.cc) - self.v0
        if abs(dv) > EPS:
            if self.cc == 0.0:
                self.a = self.a_braking if self.v0 >= 0.0 else -self.a_braking
            elif self.cc > 0.0:
                self.a = self.a_braking if dv < 0.0 else self.a_forward
            elif self.cc < 0.0:
                self.a = self.a_backward if dv < 0.0 else -self.a_braking
        else:
            self.a = 0.0
        if self.a != 0.0:
            self.t_max = self.t0 + dv / self.a
        assert (self.t_max is None) or (self.t_max >= self.t0)

        if turn is not None:
            self.turn = turn
        if self.turn == 0:
            self._turn_sign = 0.0
            self._c = None
        else:
            self._turn_sign = self.turn
            if abs(self.a) > 0.0:
                aa = 2 * abs(self.a) / self.ac_max
                m = aa / sqrt(1 - aa ** 2)
                self._sp_m = m
                self._sp_fi0 = self.sp_fi(self.t0)
                self._rv_fi = acos(m / sqrt(1 + m ** 2))
                if self.a < 0.0:
                    self._turn_sign = -self.turn
                    self.fi0 = normalize_angle(self.fi0 + pi)
            else:
                self._rv_fi = 0.5 * pi
            self._c = self.p0 + Point.polar(self.r(self.t0), self.fi0 - self._turn_sign * (pi - self._rv_fi))

        return self.t_max

    def __copy__(self):
        # todo: use standart pickling methods like __getinitargs__(), __getstate__() and __setstate__()
        # todo: Необходимо избавиться от этого метода в текущем виде. Это плохой метод.
        res = self.__class__(
            t=self.t0, p=self.p0, fi=self.fi0,
            r_min=self.r_min,
            ac_max=self.ac_max,
            v_forward=self.v_forward,
            v_backward=self.v_backward,
            a_forward=self.a_forward,
            a_backward=self.a_backward,
            a_braking=self.a_braking)
        res.a = self.a
        res.v0 = self.v0
        res._c = self._c
        res._sp_m = self._sp_m
        res._sp_fi0 = self._sp_fi0
        res._rv_fi = self._rv_fi
        res.t_max = self.t_max
        res._turn_sign = self._turn_sign
        res.turn = self.turn
        res.cc = self.cc
        res.target_point = self.target_point
        res.u_cc = self.u_cc
        return res


if __name__ == '__main__':
    pass