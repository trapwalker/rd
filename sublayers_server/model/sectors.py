# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from weapons import WeaponAuto, WeaponDischarge
from units import Unit
from math import pi


class Sector(object):
    def __init__(self, owner, radius, width, fi):
        super(Sector, self).__init__()
        self.owner = owner
        self.radius = radius
        self.width = width
        self.fi = fi
        self.half_width = width / 2.

    def as_dict(self):
        return dict(
            radius=self.radius,
            width=self.width,
            fi=self.fi,
        )


class FireSector(Sector):
    def __init__(self, **kw):
        super(FireSector, self).__init__(**kw)
        self.weapon_list = []
        self.target_list = []
        self.is_auto = False
        self.owner.fire_sectors.append(self)

    def _fire_auto_start(self, target):
        for w in self.weapon_list:
            if isinstance(w, WeaponAuto):
                w.on_start(target)

    def _fire_auto_end(self, target):
        for w in self.weapon_list:
            if isinstance(w, WeaponAuto):
                w.on_end(target)

    def add_weapon(self, weapon):
        assert weapon in self.weapon_list
        self.weapon_list.append(weapon)
        if isinstance(weapon, WeaponAuto):
            self.is_auto = True

    def del_weapon(self, weapon):
        if weapon in self.weapon_list:
            self.weapon_list.remove(weapon)
        self.is_auto = False
        for wp in self.weapon_list:
            if isinstance(wp, WeaponAuto):
                self.is_auto = True
                break

    def test_target_in_sector(self, target):
        #todo: найти место для этой функции
        def shortest_angle(angle):
            if angle < 0:
                return shortest_angle(angle + 2 * pi)
            if angle >= 2 * pi:
                return shortest_angle(angle - 2 * pi)
            if angle > pi:
                return 2 * pi - angle
            return angle

        if not isinstance(target, Unit):
            return False

        #todo: проверить объект на партийность

        v = target.position - self.owner.position
        if (v.x ** 2 + v.y ** 2) > self.radius ** 2:
            return False
        fi = self.owner.direction + self.fi
        return shortest_angle(v.angle - fi) <= self.half_width

    def fire_auto(self, target):
        if self.test_target_in_sector(target):
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
                if self.test_target_in_sector(vo):
                    cars.append(vo)
        for wp in self.weapon_list:
            if isinstance(wp, WeaponDischarge):
                wp.on_fire(cars, time)

    def out_car(self, target):
        if target in self.target_list:
            self._fire_auto_end(target=target)
            self.target_list.remove(target)
