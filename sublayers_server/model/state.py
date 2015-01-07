# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point
from math import degrees, radians, pi, sqrt, log as ln, acos


EPS = 1e-5


class ETimeIsNotInState(Exception):
    pass


def assert_time_in_state(f):
    from functools import update_wrapper
    # todo: make metadata coveringx

    def cover(self, t=None, *av, **kw):
        if self.t_max is not None and t is not None and t > self.t_max:
            raise ETimeIsNotInState('Time {} given, but {} is last in this state'.format(t, self.t_max))
        return f(self, t=t, *av, **kw)

    return update_wrapper(cover, f)


class BaseState(object):

    def __init__(self, t, p, fi=0.0, v=0.0, r_min=10.0, ac_max=10.0):
        self.t0 = t
        self.p0 = p
        self.fi0 = fi
        assert v >= 0.0
        self.v0 = v
        self.a = 0.0
        self.r_min = r_min
        assert ac_max > 0.0
        self.ac_max = ac_max

        self._c = None
        self._turn_sign = 0
        self._sp_m = 0
        self._sp_fi0 = 0
        self._rv_fi = 0

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
        #assert (a_accelerate < 0.5 * self.ac_max)  # todo: Обсудить (!)
        self.a_accelerate = a_accelerate
        self.a_braking = a_braking
        self.cc = v / v_max
        self.t_max = None
        self.target_point = None
        self.update(cc=cc, turn=turn)


    @assert_time_in_state
    def update(self, t=None, dt=0.0, cc=None, turn=None, target_point=None):
        self.fix(t=t, dt=dt)
        self.t_max = None
        if target_point is not None:
            self._update_by_target(cc, target_point)
        else:
            self._update(cc, turn)


    def _get_turn_sign(self, target_point):
        assert target_point is not None
        pt = target_point - self.p0
        pf = Point.polar(1, self.fi0)
        _turn_sign = pf.cross_mul(pt)
        if _turn_sign == 0.0 :
            return 0.0 if pf.angle_with(pt) == 0.0 else 1
        return 1 if _turn_sign > 0.0 else -1


    def _get_turn_fi(self, target_point):
        #todo: найти место для этой функции
        def normalize_angle(angle):
            if angle < 0: return normalize_angle(angle + 2 * pi)
            if angle >= 2 * pi: return normalize_angle(angle - 2 * pi)
            return angle

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


    def _update_by_target(self, cc, target_point):
        """
        Select instruction and update State for first segment of trajectory to target_point
        """

        self.target_point = target_point
        # Мы около цели, необходимо остановиться
        log.debug('111111111111111111111111111111111111111111111111111')
        if self.p0.distance(target_point) < (2 * self.r_min):
            self.target_point = None
            self._update(cc=0.0, turn=-self._get_turn_sign(target_point))
            return

        # если мы стоим, то разогнаться до min (Vcc, 5 м/c)
        log.debug('222222222222222222222222222222222222222222222222222')
        v_min = 5.0 # m/s
        assert v_min < self.v_max
        if self.v0 < v_min: #todo: определить минимальную скоростью
            temp_cc = min(cc, v_min / self.v_max)
            self._update(cc=temp_cc, turn=-self._get_turn_sign(target_point)) #todo: обсудить этот момент
            return

        # если мы не направлены в сторону цели, то повернуться к ней с постоянной скоростью
        log.debug('333333333333333333333333333333333333333333333333333')
        turn_fi = self._get_turn_fi(target_point)
        log.debug(turn_fi)
        if abs(turn_fi) > EPS:
            self._update(turn=-self._get_turn_sign(target_point))
            self.t_max = self.t0 + turn_fi * self.r(self.t0) / self.v0
            return

        # если мы направлены в сторону цели
        log.debug('444444444444444444444444444444444444444444444444444')
        s = abs(target_point - self.p0)
        self.target_point = None
        self._update(turn=0, cc=1.0)


    def _update(self, cc=None, turn=None):
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
            if dv:
                log.warning('Reduce v0+=dv: v0=%s+%s', self.v0, dv)
            self.v0 += dv
            dv = 0.0

        if self.a != 0.0:
            self.t_max = self.t0 + dv / self.a

        # todo: fix t_max==t0 problem
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


if __name__ == '__main__':
    st = State(owner=None, t=0.0, fi=0.0, p=Point(0.0), v=0.0, a_accelerate=1.0, a_braking=-1.0)
    print st._get_turn_fi(target_point=Point(0, 0)) * 180 / pi

    '''
    for a in xrange(362):
        p = Point.polar(100, a * pi / 180)
        print st._get_turn_fi(p) * 180 / pi, a
    '''

    '''
    print '==================='
    print st._get_turn_sign(Point(100, 0)), 0
    print st._get_turn_sign(Point(0, 100)), 90
    print st._get_turn_sign(Point(-100, 0)), 180
    print st._get_turn_sign(Point(0, -100)), -90
    '''




    '''
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
        s.update(*av, **kw)
        print s
    
    s = State(0.0, Point(0.0))
    print 'START:', s
    thread.start_new(lookup, (s,))
    '''
