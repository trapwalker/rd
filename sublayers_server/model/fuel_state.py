# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class ETimeIsNotInState(Exception):
    pass


def assert_time_in_fuelstate(f):
    from functools import update_wrapper
    # todo: make metadata coveringx

    def cover(self, t=None, *av, **kw):
        if self.t_fuel_empty is not None and t is not None and t > self.t_fuel_empty:
            raise ETimeIsNotInState('Time {} given, but {} is last in this fuel state'.format(t, self.t_fuel_empty))
        return f(self, t=t, *av, **kw)

    return update_wrapper(cover, f)


class FuelState(object):
    def __init__(self, t, max_fuel=100.0, fuel=100.0):
        assert (max_fuel > 0) and (max_fuel >= fuel)
        self.t0 = t
        self.t_fuel_empty = None
        self.max_fuel = max_fuel
        self.fuel0 = fuel
        self.dfs = 0.0
        self.update(self.t0)

    @property
    def classname(self):
        return self.__class__.__name__

    def fix(self, t=None, dt=0.0):
        t = (self.t0 if t is None else t) + dt
        if t != self.t0:
            self.fuel0 = self.fuel(t)
            self.t0 = t

    def fuel(self, t):
        return min(self.fuel0 - self.dfs * (t - self.t0), self.max_fuel)

    @assert_time_in_fuelstate
    def update(self, t=None, dt=0.0, df=None, dfs=None):
        self.fix(t=t, dt=dt)
        self.t_fuel_empty = None
        if df:
            self.fuel0 += df
            if self.fuel0 > self.max_fuel:
                self.fuel0 = self.max_fuel
            if self.fuel0 <= 0:
                self.t_fuel_empty = self.t0
                return self.t_fuel_empty
        if dfs:
            self.dfs = dfs
        if self.dfs > 0.0:
            self.t_fuel_empty = self.t0 + self.fuel0 / self.dfs
        return self.t_fuel_empty

    def set_fuel_empty(self, time):
        self.t0 = time
        self.t_fuel_empty = None
        self.fuel0 = 0
        self.dfs = 0

    def export(self):
        return dict(
            cls=self.classname,
            t0=self.t0,
            max_fuel=self.max_fuel,
            fuel0=self.fuel0,
            dfs=self.dfs,
        )

    def __copy__(self):
        # todo: use standart pickling methods like __getinitargs__(), __getstate__() and __setstate__()
        # todo: Необходимо избавиться от этого метода в текущем виде. Это плохой метод.
        res = self.__class__(
            t=self.t0,
            max_fuel=self.max_fuel,
            fuel=self.fuel0,
            )
        res.dfs = self.dfs
        return res