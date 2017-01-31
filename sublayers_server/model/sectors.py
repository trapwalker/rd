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
        self.area_target_list = []
        self._is_auto = 0
        self._is_discharge = 0
        self.side = get_side_by_angle(self.fi)
        self.owner.fire_sectors.append(self)

    def __str__(self):
        return 'FireSector[{}|auto={}|disch={}]'.format(self.side, self.is_auto(), self.is_discharge())

    def as_dict(self):
        d = super(FireSector, self).as_dict()
        d.update(
            side=self.side,
            weapons=[weapon.as_dict() for weapon in self.weapon_list],
        )
        return d

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

    def _test_target_in_sector(self, target, time):
        if not self.owner.is_target(target=target):
            return False
        v = target.position(time=time) - self.owner.position(time=time)
        if (v.x ** 2 + v.y ** 2) > self.radius ** 2:
            return False
        if self.width >= 2 * pi:
            return True
        fi = self.owner.direction(time=time) + self.fi
        return shortest_angle(v.angle - fi) <= self.half_width

    def fire_auto(self, target_list, time):
        old_target_list = set(self.target_list)
        for target in (old_target_list - target_list):
            self.out_car(target=target, time=time)
        for target in target_list:
            if self._test_target_in_sector(target=target, time=time):
                self.add_car(target=target, time=time)
            else:
                self.out_car(target=target, time=time)

    def fire_discharge(self, time):
        # Формирование списка целей, по которым пройдёт полный дамаг
        target_list = []
        temp_list = []
        if self.owner.main_agent is not None:
            temp_list = self.owner.main_agent.get_all_visible_objects()
        else:
            temp_list = self.owner.visible_objects
        for vo in temp_list:
            if self._test_target_in_sector(target=vo, time=time):
                target_list.append(vo)
        self.target_list = target_list

        # Формирование списка целей, которых юнит не видит (осколочный дамаг)
        target_list = []
        temp_list = self.owner.server.visibility_mng.get_around_objects(pos=self.owner.position(time=time), time=time)
        for vo in temp_list:
            if (vo not in self.target_list) and self._test_target_in_sector(target=vo, time=time):
                target_list.append(vo)
        self.area_target_list = target_list

        for wp in self.weapon_list:
            if isinstance(wp, WeaponDischarge):
                wp.fire(time=time)

    def add_car(self, target, time):
        if target not in self.target_list:
            self.target_list.append(target)
            for w in self.weapon_list:
                if isinstance(w, WeaponAuto):
                    w.add_car(car=target, time=time)

    def out_car(self, target, time):
        if target in self.target_list:
            owner = None if self.owner is None or self.owner.main_agent is None else self.owner.main_agent
            if owner:
                owner.log.info('Sector {} Del Target {} car_owner={}  time={}'.format(self, target, owner, time))
            self.target_list.remove(target)
            for w in self.weapon_list:
                if isinstance(w, WeaponAuto):
                    w.del_car(car=target, time=time)

    def can_discharge_fire(self, time):
        for wp in self.weapon_list:
            if isinstance(wp, WeaponDischarge):
                if not wp.can_fire(time):
                    return False
        return True

    def enable_auto_fire(self, time, enable):
        # log.debug('%s  enable auto_fire: %s    on side: %s', self.owner.uid, enable, self.side)
        if not enable:
            for target in self.target_list:
                self.out_car(target=target, time=time)
        for w in self.weapon_list:
            if isinstance(w, WeaponAuto):
                w.set_enable(enable=enable, time=time)

    def is_discharge(self):
        return self._is_discharge > 0

    def is_auto(self):
        return self._is_auto > 0

    def is_auto_enable(self):
        # todo: переписать, проверка не логична, но пока верно работает (так как 1 сектор = 1 оружие)
        for w in self.weapon_list:
            if isinstance(w, WeaponAuto):
                if w.get_enable():
                    return True
        return False