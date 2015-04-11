# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class ETimeIsNotInState(Exception):
    pass


def assert_time_in_hpstate(f):
    from functools import update_wrapper
    # todo: make metadata coveringx

    def cover(self, t=None, *av, **kw):
        if self.t_die is not None and t is not None and t > self.t_die:
            raise ETimeIsNotInState('Time {} given, but {} is last in this state'.format(t, self.t_die))
        return f(self, t=t, *av, **kw)

    return update_wrapper(cover, f)


class HPState(object):
    def __init__(self, t, max_hp=100.0, hp=100.0, dps=0.0):
        assert (max_hp > 0) and (max_hp >= hp)
        self.shooters = []
        self.t0 = t
        self.t_die = None
        self.max_hp = max_hp
        self.hp0 = hp
        self.dps = dps  # отрицательный dps => хил
        self.update(self.t0)
        self.dhp = 0

    @property
    def classname(self):
        return self.__class__.__name__

    def fix(self, t=None, dt=0.0):
        t = (self.t0 if t is None else t) + dt
        if t != self.t0:
            self.hp0 = self.hp(t)
            self.t0 = t

    def hp(self, t):
        # Мин нужен для хила, хп не увеличится больше чем max_hp
        return min(self.hp0 - self.dps * (t - self.t0), self.max_hp)

    def add_shooter(self, shooter):
        self.shooters.append(shooter)

    def del_shooter(self, shooter):
        assert shooter in self.shooters
        self.shooters.remove(shooter)

    @assert_time_in_hpstate
    def update(self, t=None, dt=0.0, dhp=None, dps=None):
        self.fix(t=t, dt=dt)
        self.t_die = None
        if dhp:
            self.hp0 -= dhp
            if self.hp0 <= 0:
                self.t_die = self.t0
                return self.t_die
            if self.hp0 > self.max_hp:
                self.hp0 = self.max_hp
        if dps:
            self.dps += dps
        if self.dps > 0.0:
            self.t_die = self.t0 + self.hp0 / self.dps
        return self.t_die

    def set_die(self, time):
        self.t0 = time
        self.t_die = time
        self.hp0 = 0
        self.dps = 0

    def export(self):
        return dict(
            cls=self.classname,
            t0=self.t0,
            max_hp=self.max_hp,
            hp0=self.hp0,
            dps=self.dps,
        )

    def __copy__(self):
        # todo: use standart pickling methods like __getinitargs__(), __getstate__() and __setstate__()
        # todo: Необходимо избавиться от этого метода в текущем виде. Это плохой метод.
        return self.__class__(
            t=self.t0,
            max_hp=self.max_hp,
            hp=self.hp0,
            dps=self.dps,
            )