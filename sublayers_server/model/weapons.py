# -*- coding: utf-8 -*-

import logging
from math import pi

log = logging.getLogger(__name__)

from units import Unit
from balance import BALANCE
from errors import EIllegal


class EWeaponIsNotAttached(EIllegal):
    pass


class Weapon(object):

    def __init__(self, owner=None, damage=BALANCE.Weapon.damage, r=BALANCE.Weapon.r):
        """
        @type owner: sublayers_server.model.units.Unit | None
        """
        super(Weapon, self).__init__()
        self.owner = owner
        self.damage = damage
        self.r = r

    def as_dict(self, **kw):
        return dict(
            damage=self.damage,
            r=self.r,
        )

    def ids2units(self, ids):
        """
        @type ids: list[sublayers_server.model.units.Unit | int | str]
        @rtype: list[sublayers_server.model.units.Unit]
        # todo: declare ids UID type
        """
        if not self.owner:
            raise EWeaponIsNotAttached('Trying to resolve units id')
        units = []
        srv = self.owner.server
        for u in ids:
            if isinstance(u, Unit):
                units.append(u)
            else:
                unit = srv.objects.get(u)
                if unit:
                    units.append(u)
                else:
                    log.warning('Unit with id=%s is not found.', u)

        return units

    def hit_search(self, enemy_list=None):
        """
        @rtype: list[sublayers_server.model.units.Unit]
        """
        return self.ids2units(enemy_list)

    def hit_test(self, unit):
        """
        @type unit: sublayers_server.model.units.Unit
        @rtype: bool
        """
        return True

    def fire(self, enemy_list=None):
        enemyes = filter(self.hit_test, self.hit_search(enemy_list))
        for enemy in enemyes:
            enemy.hit(self.damage)


class SectoralWeapon(Weapon):
    def __init__(self, direction=0, sector_width=pi/4, **kw):
        """
        @type direction: float
        @type sector_width: float
        """
        super(SectoralWeapon, self).__init__(**kw)
        self.direction = direction
        self.sector_width = sector_width

    # todo: hit_test emplementation
    # todo: hit_search emplementation

    def abs_direction(self):
        if not self.owner:
            raise EWeaponIsNotAttached('Trying to get weapon absolute direction')
        return self.owner.direction + self.direction

    def as_dict(self, **kw):
        d = super(SectoralWeapon, self).as_dict(**kw)
        d.update(
            direction=self.direction,
            sector_width=self.sector_width,
        )
        return d
