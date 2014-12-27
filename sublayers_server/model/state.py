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
    from functools import update_wrapper
    # todo: make metadata coveringx

    def cover(self, t=None, *av, **kw):
        if self.t_max is not None and t is not None and t > self.t_max:
            raise ETimeIsNotInState('Time {} given, but {} is last in this state'.format(t, self.t_max))
        return f(self, t=t, *av, **kw)

    return update_wrapper(cover, f)


class BaseState(object):

    def __init__(self, t, p, fi=0.0, v=0.0, a=0.0, c=None):
        """
        @param float t: time (sec)
        @param Point p: position (m)
        @param float fi: direction (rad)
        @param float v: velocity (m/s)
        @param float a: linear accelerate (m/s^2)
        @param Point|None c: current center of turning if turning is (m)
        """
        self.t0 = t
        self.p0 = p
        self.fi0 = fi
        assert v >= 0.0
        self.v0 = v
        self.a = a
        self.c = c

        # Кэш вычислимых параметров
        if c is None:
            self._r = None
            self._turn_sign = 0
        else:
            assert c != p
            pc = p - c
            self._r = abs(pc)
            _turn_sign = Point.polar(1, fi).cross_mul(pc)
            assert _turn_sign
            self._turn_sign = 1 if _turn_sign > 0.0 else -1

    @property
    def turn_sign(self):
        if self.c is None:
            return 0
        pc = self.p0 - self.c
        _turn_sign = Point.polar(1, self.fi0).cross_mul(pc)
        assert _turn_sign
        return 1 if _turn_sign > 0.0 else -1

    def fix(self, t=None, dt=0.0):
        """
        @param float t: time (sec), t == t0 by default
        @param float dt: delta time (sec)

        Функция приведения Состояния ко времени t+dt.
        Базовые параметры обновляются на заданный момент.
        """
        t = (self.t0 if t is None else t) + dt

        if t != self.t0:
            self.p0 = self.p(t)
            """@type: Point"""
            self.fi0 = self.fi(t)
            self.v0 = self.v(t)
            self.t0 = t

    def v(self, t):
        return self.v0 + self.a * (t - self.t0)

    def fi(self, t):
        if self.c is None:
            return self.fi0

        dt = t - self.t0
        return self.fi0 - (0.5 * self.a * dt ** 2 + self.v0 * dt) / self._r * self._turn_sign

    def p(self, t):
        """
        @param float t: time
        @rtype: Point
        """
        if self.c is None:
            dt = t - self.t0
            return self.p0 + Point.polar(0.5 * self.a * dt ** 2 + self.v0 * dt, self.fi0)
        else:
            return self.c + Point.polar(self._r, self.fi(t) + self._turn_sign * pi * 0.5)

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
            c=self.c,
            #_r=self._r,
            turn=self._turn_sign,
        )

    @property
    def is_moving(self):
        return self.v0 > 0.0 or self.a > 0.0


class State(BaseState):

    def __init__(
        self,
        owner,
        t, p, fi=0.0, v=0.0, a=0.0, c=None,
        cc=0.0, turn=0, target_point=None,

        r_min=5.0,    # m
        v_max=28.0,   # m/s ~ 100km/h
        ac_max=10.0,  # m/s^2 ~ 1g
        a_accelerate=5.0,
        a_braking=-10.0,
    ):
        """
        @param sublayers_server.model.units.Mobile owner: owner of the state
        @param float t: time (sec)
        @param Point p: position (m)
        @param float fi: direction (rad)
        @param float v: velocity (m/s)
        @param float a: linear accelerate (m/s^2)
        @param Point|None c: current center of turning if turning is (m)

        @param float cc: Cruise speed ratio
        @param int turn: segment trajectory turning factor: 0 - forward; 1 - CCW; -1 - CW
        @param Point|None target_point: target point of motion

        @param float r_min: minimal turning radius (m)
        @param float v_max: maximal possible velocity (m/s)
        @param float ac_max: maximal centripetal acceleration (m/s**2)
        @param float a_accelerate: typical acceleration (m/s**2)
        @param float a_braking: typical braking (m/s**2)
        """
        super(State, self).__init__(t, p, fi, v, a, c)
        self.owner = owner

        self.a_accelerate = a_accelerate
        self.a_braking = a_braking
        self.v_max = v_max
        self.r_min = r_min
        assert ac_max > 0.0
        self.ac_max = ac_max

        # just declare
        self.t_max = None
        self.cc = None
        self._v_cc = None
        self.target_point = None

        self.update(cc=cc, turn=turn, target_point=target_point)

    def _update_by_target(self, target_point):
        """
        Select instruction and update State for first segment of trajectory to target_point
        """
        self.target_point = target_point
        # todo: calc and store future trip distance

        braking_dist = -0.5 * self.v0 ** 2 / self.a_braking
        target_distance = self.p0.distance(target_point)
        target_direction = self.p0.direction(target_point)

        # todo: normalize angles before compare (!)
        if abs(target_distance - braking_dist) <= EPS and (self.v0 <= EPS or target_direction == self.fi0):
            # we have arrived or we must brake to a stop
            self.cc = 0.0
            target_point = None
        elif target_distance > braking_dist and target_direction == self.fi0:
                # we must accelerate first
            if self.cc < EPS:
                self.cc = 1.0

                # b=-0.5*v**2/ab
                # v=v0+a*t
            # todo: accelerate

    @assert_time_in_state
    def update(self, t=None, dt=0.0, cc=None, turn=None, target_point=None):
        """
        @param float t: time (sec)
        @param float dt: delta time (sec)
        @param float cc: Cruise speed ratio
        @param int turn: segment trajectory turning factor: 0 - forward; 1 - CCW; -1 - CW
        @param Point|None target_point: target point of motion
        """
        self.fix(t=t, dt=dt)
        self.t_max = None

        if cc is not None:
            self.cc = cc

        if target_point is not None:
            assert turn is None, 'Turn factor and target_point declared both in state update.'
            self._update_by_target(target_point)

        self._v_cc = self.v_max * self.cc
        target_v = self._v_cc

        if turn is not None:
            self._turn_sign = turn
            if turn == 0:
                self._r = None
                self.c = None
            else:
                self._r = self.v0 ** 2 / self.ac_max
                if self._r < self.r_min:
                    log.debug('===== r=%s < rmin=%s; target_v=%s', self._r, self.r_min, target_v)
                    self._r = self.r_min
                    target_v = min(target_v, sqrt(self._r * self.ac_max))
                    log.debug('===== new target_v=%s', target_v)
                else:
                    target_v = min(target_v, self.v0)
                self.c = (self.p0 + Point.polar(self._r, self.fi0 - self._turn_sign * pi / 2.0))

        dv = target_v - self.v0

        if dv > EPS:
            self.a = self.a_accelerate
        elif dv < -EPS:
            self.a = self.a_braking
        else:
            self.a = 0.0

        log.debug('===== old t_max=%s', self.t_max)

        old_t_max = self.t_max

        if self.a:
            self.t_max = self.t0 + dv / self.a

        if old_t_max is not None and self.t_max is not None:
            if -EPS < old_t_max - self.t_max < EPS:
                self.t_max = None   # иначе бесконечный цикл

        #log.debug('===== dv=%s, a=%s, t_max-t=%s', dv, self.a, (self.t_max - t) if self.t_max else 'None')

        #log.debug('State: after update: turn_sign=%s; c=%s, r=%s, t_max-t=%s',
        #          self._turn_sign, self.c, self._r, (self.t_max - t) if self.t_max else 'None')

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
