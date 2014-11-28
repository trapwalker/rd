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
        @param sublayers_server.model.units.Unit owner: owner of weapon
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

    def id2unit(self, id):
        """
        @param sublayers_server.model.units.Unit | int | str id: unit or id of unit
        """
        if isinstance(id, Unit):
            return id
        else:
            owner = self.owner
            if not owner:
                raise EWeaponIsNotAttached('Trying to resolve units id')
            unit = owner.server.objects.get(id)
            if unit is None:
                log.warning('Unit with id=%s is not found.', id)
            return unit

    def fire(self, hit_list=None):
        if hit_list is None:
            return

        hits = [(self.id2unit(hit['carID']), hit['damage_factor']) for hit in hit_list]
        for unit, factor in hits:
            log.debug('Hit unit %s to %s*%s=%s', unit, factor, self.damage, self.damage * factor)
            if unit:
                unit.hit(self.damage * factor)
                # todo: make 'hit' or 'fire' event or message


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
