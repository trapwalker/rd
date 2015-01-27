# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point, normalize_angle
from math import degrees, pi, sqrt, log as ln, acos

EPS = 1e-5


class ETimeIsNotInState(Exception):
    pass


def assert_time_in_state(f):
    from functools import update_wrapper
    # todo: make metadata coveringx

    def cover(self, t=None, *av, **kw):
        if self.t_max is not None and t is not None and not (self.t0 <= t <= self.t_max):
            raise ETimeIsNotInState('Time {} given, but {} is last in this state and t0 is {}'.format(t, self.t_max, self.t0))
        return f(self, t=t, *av, **kw)

    return update_wrapper(cover, f)


class BaseState(object):

    def __init__(self, t, p, fi=0.0, v=0.0, a=0.0, r_min=10.0, ac_max=10.0, c = None, turn = 0.0, sp_m = 0.0, sp_fi0 = 0.0, rv_fi = 0.0):
        self.t0 = t
        self.p0 = p
        self.fi0 = fi
        self.v0 = v
        self.a = a
        self.r_min = r_min
        assert ac_max > 0.0
        self.ac_max = ac_max
        self._c = c
        self._turn_sign = turn
        self._sp_m = sp_m
        self._sp_fi0 = sp_fi0
        self._rv_fi = rv_fi

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
        return self.v0 + self.a * dt

    def r(self, t):
        if self.a < 0:
            return (self.v0 ** 2) / self.ac_max + self.r_min
        return (self.v(t) ** 2) / self.ac_max + self.r_min

    def sp_fi(self, t):
        assert self._sp_m > 0
        return ln(self.r(t) / self.r_min) / self._sp_m

    def fi(self, t):
        if self._c is None:
            return self.fi0
        if self.a <= 0.0:
            return self.fi0 - self.s(t) / self.r(t) * self._turn_sign
        return self.fi0 - (self.sp_fi(t) - self._sp_fi0) * self._turn_sign

    def p(self, t):
        if self._c is None:
            return self.p0 + Point.polar(self.s(t), self.fi0)
        return self._c + Point.polar(self.r(t), self.fi(t) + self._turn_sign * self._rv_fi)

    def export(self):
        u"""
        Представление параметров состояния для клиента.
        """
        return dict(
            cls='MobileState',
            t0=self.t0,
            p0=self.p0,
            fi0=self.fi0,
            v0=self.v0 if abs(self.v0) > EPS else 0,
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
        return self.v0 > 0.0 or self.a > 0.0


class State(BaseState):

    def __init__(
        self, owner, t, p, fi=0.0, v=0.0,
        cc=0.0,
        turn=0,
        r_min=10,
        ac_max=10.0,
        v_max=30.0,
        a_accelerate=4.0,
        a_braking=-8.0,
    ):
        assert (v_max > 0) and (v <= v_max)
        assert (a_accelerate > 0) and (a_braking < 0)

        self.owner = owner
        super(State, self).__init__(t, p, fi, v, r_min, ac_max)
        self.v_max = v_max
        assert (a_accelerate < 0.5 * self.ac_max)
        self.a_accelerate = a_accelerate
        self.a_braking = a_braking
        self.cc = v / v_max
        self.t_max = None
        self.target_point = None
        self.update(cc=cc, turn=turn)

    def _get_turn_sign(self, target_point):
        assert target_point is not None
        pt = target_point - self.p0
        pf = Point.polar(1, self.fi0)
        _turn_sign = pf.cross_mul(pt)
        if _turn_sign == 0.0 :
            return 0.0 if pf.angle_with(pt) == 0.0 else 1
        return 1 if _turn_sign > 0.0 else -1

    def _get_turn_fi(self, target_point):
        assert target_point is not None
        turn_sign = self._get_turn_sign(target_point=target_point)
        if turn_sign == 0.0:
            return 0.0
        r = self.r(self.t0)
        c = self.p0 + Point.polar(r, self.fi0 + turn_sign * 0.5 * pi)
        cp = self.p0 - c
        ct = target_point - c
        ct_angle = ct.angle
        ce_fi = ct_angle - turn_sign * acos(r / abs(ct))
        if ce_fi < - pi: ce_fi = 2 * pi + ce_fi
        if ce_fi > pi: ce_fi = ce_fi - 2 * pi
        res = ce_fi - cp.angle
        if turn_sign < 0: res = 2 * pi - res
        return normalize_angle(res)

    def _calc_time_segment(self, s, cc):
        u"""
        Возвращает  (t1, t2, t3)
        t1 - время отведённое на разгон
        t2 - время отведённое на равномерное движение
        t3 - время отведённое на торможение
        """
        vcc = cc * self.v_max
        v0 = self.v0
        bb = self.a_braking
        aa = self.a_accelerate if vcc > v0 else self.a_braking

        # рассчитать тормозной путь от текущей скорости
        t4 = - v0 / bb
        s4 = v0 * t4 + bb * (t4 ** 2) / 2.0
        if s4 >= s:  # если не успеваем, то сразу торможение
            if abs(t4) < EPS:
                t4 = 0.0
            return (0.0, 0.0, t4)
        # путь и время разгона
        t1 = (vcc - v0) / aa
        if abs(t1) < EPS: t1 = 0.0
        s1 = v0 * t1 + aa * (t1 ** 2) / 2.0
        # путь и время торможения
        t3 = - vcc / bb
        if abs(t3) < EPS:
            t3 = 0.0
        s3 = vcc * t3 + bb * (t3 ** 2) / 2.0

        if s3 + s1 > s:  # нет равномерного движения
            if aa == bb:  # мы уже в торможении
                return (0.0, 0.0, t3)  # остановка
            else:  # нет запаса расстояния для разгона до vcc
                # рассчёт времени разгона и торможения
                t3 = sqrt((2*aa*s + v0 ** 2) / (bb ** 2 - aa * bb))
                t1 = (- bb * t3 - v0) / aa
                if abs(t1) < EPS: t1 = 0.0
                return (t1, 0.0, t3)  # разгон и торможение

        if s3 + s1 <= s:  # есть отрезок равномерного движения
            s2 = s - s3 - s1
            t2 = s2 / vcc
            if abs(t2) < EPS: t2 = 0.0  # чтобы не добавлять ивент через очень короткое время
            return (t1, t2, t3)

    @assert_time_in_state
    def update(self, t=None, dt=0.0, cc=None, turn=None):
        self.fix(t=t, dt=dt)
        self.t_max = None

        if cc is not None:
            assert  0 <= cc <= 1
            self.cc = cc
        assert self.cc is not None

        dv = self.v_max * self.cc - self.v0
        if dv > EPS:
            self.a = self.a_accelerate
        elif dv < -EPS:
            self.a = self.a_braking
        else:
            self.a = 0.0
        if self.a != 0.0:
            self.t_max = self.t0 + dv / self.a

        if turn is not None:
            self._turn_sign = turn
        if self._turn_sign == 0:
            self._c = None
        else:
            if self.a > 0.0:
                aa = 2 * self.a / self.ac_max
                m = aa / sqrt(1 - aa ** 2)
                self._sp_m = m
                self._sp_fi0 = self.sp_fi(self.t0)
                self._rv_fi = acos(m / sqrt(1 + m ** 2))
            else:
                self._rv_fi = 0.5 * pi
            self._c = self.p0 + Point.polar(self.r(self.t0), self.fi0 - self._turn_sign * (pi - self._rv_fi))

        return self.t_max

    def __str__(self):
        return (
            '<t=[{t0:.2f}-{t_max_str}];'
            ' p=[{p0.x:.1f}, {p0.y:.1f}];'
            ' fi={fi_deg:.0f};'
            ' v={v0:.0f};'
            ' a={a:.0f};'
            ' turn={turn};'
            ' cc={cc_percent:.0f}% ({_v_cc:.0f}m/s)>'
        ).format(
            fi_deg=degrees(self.fi0),
            cc_percent=self.cc * 100,
            t_max_str='{:.2f}'.format(self.t_max) if self.t_max is not None else '',
            **self.__dict__
        )

    def __copy__(self):
        # todo: use standart pickling methods like __getinitargs__(), __getstate__() and __setstate__()
        # todo: Необходимо избавиться от этого метода в текущем виде. Это плохой метод.
        res = self.__class__(
            owner=self.owner, t=self.t0, p=self.p0, fi=self.fi0, v=self.v0,
            cc=self.cc,
            turn=self._turn_sign,
            r_min=self.r_min,
            ac_max=self.ac_max,
            v_max=self.v_max,
            a_accelerate=self.a_accelerate,
            a_braking=self.a_braking)
        res.a = self.a
        res._c = self._c
        res._sp_m = self._sp_m
        res._sp_fi0 = self._sp_fi0
        res._rv_fi = self._rv_fi
        res.t_max = self.t_max
        return res

if __name__ == '__main__':
    pass
