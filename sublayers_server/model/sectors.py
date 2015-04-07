# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.weapons import WeaponAuto, WeaponDischarge
from sublayers_server.model.vectors import shortest_angle, normalize_angle

from math import pi


def get_angle_by_side(side):
    if side == 'front':
        return 0.0
    elif side == 'right':
        return pi / 2.
    elif side == 'back':
        return pi
    elif side == 'left':
        return 3 * pi / 2.
    return None


def get_side_by_angle(angle):
    pi4 = pi / 4.
    if pi4 < angle < 3 * pi4:
        return 'right'
    if 3 * pi4 <= angle <= 5 * pi4:
        return 'back'
    if 5 * pi4 < angle < 7 * pi4:
        return 'left'
    return 'front'


class Sector(object):
    def __init__(self, owner, radius, width, fi):
        super(Sector, self).__init__()
        self.owner = owner
        self.radius = radius
        self.width = width
        self.fi = normalize_angle(fi)  # угол относительно машинки
        self.half_width = width / 2.

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self):
        return dict(
            cls=self.classname,
            radius=self.radius,
            width=self.width,
            fi=self.fi,
        )


class FireSector(Sector):
    def __init__(self, **kw):
        super(FireSector, self).__init__(**kw)
        self.weapon_list = []
        self.target_list = []
        self._is_auto = 0
        self._is_discharge = 0
        self.side = get_side_by_angle(self.fi)
        self.owner.fire_sectors.append(self)

    def as_dict(self):
        d = super(FireSector, self).as_dict()
        d.update(
            side=self.side,
            weapons=[weapon.as_dict() for weapon in self.weapon_list],
        )
        return d

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
            self._is_auto += 1
        else:
            self._is_discharge += 1

    def del_weapon(self, weapon):
        if weapon in self.weapon_list:
            self.weapon_list.remove(weapon)
        if isinstance(weapon, WeaponAuto):
            self._is_auto -= 1
        else:
            self.is_discharge -= 1
        assert (self._is_auto >= 0) and (self.is_discharge >= 0)

    def _test_target_in_sector(self, target):
        if not self.owner.main_unit.is_target(target):
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
        if self._is_auto:
            cars = self.target_list
        else:
            for vo in self.owner.visible_objects:
                if self._test_target_in_sector(vo):
                    cars.append(vo)
            self.target_list = cars
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
        #log.debug('%s  enable auto_fire: %s    on side: %s', self.owner.uid, enable, self.side)
        for w in self.weapon_list:
            if isinstance(w, WeaponAuto):
                w.set_enable(enable, self.target_list)

    def is_discharge(self):
        return self._is_discharge > 0

    def is_auto(self):
        return self._is_auto > 0

    def is_auto_enable(self):
        for w in self.weapon_list:
            if isinstance(w, WeaponAuto):
                if w.get_enable():
                    return True
        return False