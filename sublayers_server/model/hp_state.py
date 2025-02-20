# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


EPS = 1e-5


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
    def __init__(self, owner, t, max_hp, hp, dps=0.0):
        if not (max_hp > 0 and max_hp >= hp):
            log.warning('HPState of {}: Wrong value hp={} max={}. hp:=max_hp'.format(owner, hp, max_hp))
            hp = max_hp

        self.owner = owner
        self.shooters = []
        self.weapons = []
        self.t0 = t
        self.t_die = None
        self.max_hp = max_hp
        self.hp0 = hp
        self.dps = dps  # отрицательный dps => хил
        self.update(t=self.t0)
        self.dhp = 0
        self._is_die = False  # info: Флаг для определения актуальности HPState. Чтобы нельзя было много раз вызвать set_die и on_kill

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

    def restart_weapons(self, time):
        for weapon in self.weapons:
            weapon.restart_fire_to_car(car=self.owner, time=time)

    def add_weapon(self, weapon):
        self.weapons.append(weapon)

    def del_weapon(self, weapon):
        assert weapon in self.weapons, '{} from {}'.format(weapon, self.weapons)
        self.weapons.remove(weapon)

    def add_shooter(self, shooter):
        self.shooters.append(shooter)

    def del_shooter(self, shooter):
        assert shooter in self.shooters, '{} from {}'.format(shooter, self.shooters)
        self.shooters.remove(shooter)

    @assert_time_in_hpstate
    def update(self, t=None, dt=0.0, dhp=None, dps=None):
        self.fix(t=t, dt=dt)
        self.t_die = None
        if dhp:
            self.dhp = dhp
            self.hp0 -= dhp
            if self.hp0 <= 0:
                self.t_die = self.t0
                return self.t_die
            if self.hp0 > self.max_hp:
                self.hp0 = self.max_hp
        if dps:
            self.dps += dps
            if abs(self.dps) < EPS:
                self.dps = 0.0
        if self.dps > 0.0:
            self.t_die = self.t0 + self.hp0 / self.dps
        return self.t_die

    def set_die(self, time):
        self.t0 = time
        self.t_die = time
        self.hp0 = 0
        self.dps = 0
        self._is_die = True

    def export(self):
        dhp = self.dhp
        self.dhp = 0
        return dict(
            cls=self.classname,
            t0=self.t0,
            max_hp=self.max_hp,
            hp0=self.hp0,
            dps=self.dps,
            dhp=dhp
        )


    def __copy__(self):
        # todo: use standart pickling methods like __getinitargs__(), __getstate__() and __setstate__()
        # todo: Необходимо избавиться от этого метода в текущем виде. Это плохой метод.
        return self.__class__(
            owner=self.owner,
            t=self.t0,
            max_hp=self.max_hp,
            hp=self.hp0,
            dps=self.dps,
            )