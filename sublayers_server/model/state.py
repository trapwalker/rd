# -*- coding: utf-8 -*-

#import logging
#log = logging.getLogger(__name__)

from vectors import Point
from math import degrees, radians, pi, sqrt, log, acos


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
        return log(self.r(t) / self.r_min) / self._sp_m

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

    def __init__(self, owner, t, p, fi=0.0, v=0.0,
        r_min=10,
        ac_max=10.0,
        v_max=30.0,
        a_accelerate=4.0,
        a_braking=-8.0,
        ):

        self.owner = owner
        super(State, self).__init__(t, p, fi, v, r_min, ac_max)

        self.v_max = v_max
        assert (a_accelerate > 0) and (a_braking < 0)
        assert (a_accelerate < 0.5 * self.ac_max)
        self.a_accelerate = a_accelerate
        self.a_braking = a_braking
        self.cc = None
        self.t_max = None
        self.target_point = None

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
        self.fix(t=t, dt=dt)
        self.t_max = None

        if cc is not None:
            assert  0 <= cc <= 1
            self.cc = cc
        if self.cc is not None:
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
        if self._turn_sign is not None:
            if self._turn_sign == 0:
                self._c = None
            else:
                if self.a > 0.0:
                    aa = 2 * self.a / self.ac_max
                    m = aa / sqrt(1 - aa ** 2)
                    self._sp_m = m
                    self._sp_fi0 = self.sp_fi(self.t0)
                    self._rv_fi = acos(m / sqrt(1 + m ** 2))
                    self._c = self.p0 + Point.polar(self.r(self.t0), self.fi0 - self._turn_sign * (pi - self._rv_fi))
                else:
                    self._rv_fi = 0.5 * pi
                    self._c = self.p0 + Point.polar(self.r(self.t0), self.fi0 - self._turn_sign * self._rv_fi)

        #if target_point is not None:
        #    assert turn is None, 'Turn factor and target_point declared both in state update.'
        #    self._update_by_target(target_point)

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
    st = State(owner=None, t=0.0, fi=0.0, p=Point(0.0), v=30.0, a_accelerate=1.0, a_braking=-1.0)
    #st.update(cc=1.0)
    #print st.p(t=1.0)

    st.update(cc=0.0, turn=1.0)

    print ' c=', st._c


    for t in xrange(31):
        print 't=', t, ' r(t)=', st.r(t), ' p(t)=', st.p(t), ' fi(t)=', 180/pi*st.fi(t)

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
