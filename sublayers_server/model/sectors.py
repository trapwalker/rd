# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from weapons import WeaponAuto, WeaponDischarge
from math import pi
from vectors import shortest_angle, normalize_angle


class Sector(object):
    def __init__(self, owner, radius, width, fi):
        super(Sector, self).__init__()
        self.owner = owner
        self.radius = radius
        self.width = width
        self.fi = normalize_angle(fi)  # угол относительно машинки
        self.half_width = width / 2.

    def as_dict(self):
        return dict(
            cls=self.__class__.__name__,
            radius=self.radius,
            width=self.width,
            fi=self.fi,
        )


class FireSector(Sector):
    def __init__(self, **kw):
        super(FireSector, self).__init__(**kw)
        self.weapon_list = []
        self.target_list = []
        self.is_auto = 0
        self.side = self._check_side()
        self.owner.fire_sectors.append(self)

    def as_dict(self):
        d = super(FireSector, self).as_dict()
        d.update(
            side=self.side,
            weapons=[weapon.as_dict() for weapon in self.weapon_list],
        )
        return d

    def _check_side(self):
        fi = self.fi
        pi4 = pi / 4.
        if pi4 < fi < 3 * pi4:
            return 'left'
        if 3 * pi4 <= fi <= 5 * pi4:
            return 'back'
        if 5 * pi4 < fi < 7 * pi4:
            return 'right'
        return 'front'

    def _fire_auto_start(self, target):
        for w in self.weapon_list:
            if isinstance(w, WeaponAuto):
                w.start(target)

    def _fire_auto_end(self, target):
        for w in self.weapon_list:
            if isinstance(w, WeaponAuto):
                w.end(target)

    def add_weapon(self, weapon):
        assert not (weapon in self.weapon_list)
        self.weapon_list.append(weapon)
        if isinstance(weapon, WeaponAuto):
            self.is_auto += 1

    def del_weapon(self, weapon):
        if weapon in self.weapon_list:
            self.weapon_list.remove(weapon)
        if isinstance(weapon, WeaponAuto):
            self.is_auto -= 1
        assert self.is_auto >= 0

    def _test_target_in_sector(self, target):
        if not self.owner.is_target(target):
            return False
        v = target.position - self.owner.position
        if (v.x ** 2 + v.y ** 2) > self.radius ** 2:
            return False
        if self.width >= 2 * pi:
            return True
        fi = self.owner.direction + self.fi
        return shortest_angle(v.angle - fi) <= self.half_width

    def fire_auto(self, target):
        if self._test_target_in_sector(target):
            if not target in self.target_list:
                self.target_list.append(target)
                self._fire_auto_start(target)
        else:
            self.out_car(target=target)

    def fire_discharge(self, time):
        cars = []
        if self.is_auto:
            cars = self.target_list
        else:
            for vo in self.owner.visible_objects:
                if self._test_target_in_sector(vo):
                    cars.append(vo)
        t_rch = 0
        for wp in self.weapon_list:
            if isinstance(wp, WeaponDischarge):
                t_rch = max(t_rch, wp.fire(cars, time))
        return t_rch

    def out_car(self, target):
        if target in self.target_list:
            self._fire_auto_end(target=target)
            self.target_list.remove(target)

    def can_discharge_fire(self, time):
        for wp in self.weapon_list:
            if isinstance(wp, WeaponDischarge):
                if not wp.can_fire(time):
                    return False
        return True

    def enable_auto_fire(self, enable=False):
        log.debug('================ sector off or on auto_fire !!! side of sector: %s', self.side)
        for w in self.weapon_list:
            if isinstance(w, WeaponAuto):
                w.set_enable(enable, self.target_list)