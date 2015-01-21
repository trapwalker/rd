# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from balance import BALANCE
from hp_task import HPTask


class Weapon(object):
    def __init__(self, owner, radius=BALANCE.Weapon.radius, width=BALANCE.Weapon.width):
        super(Weapon, self).__init__()
        self.owner = owner
        self.owner.weapons.append(self)
        self.radius = radius
        self.width = width

    def as_dict(self, **kw):
        return dict(
            radius=self.radius,
            width=self.width,
        )


class WeaponAuto(Weapon):
    def __init__(self, dps=BALANCE.Weapon.dps, **kw):
        super(WeaponAuto, self).__init__(**kw)
        self.dps = dps

    def as_dict(self, **kw):
        d = super(WeaponAuto, self).as_dict(**kw)
        d.update(
            dps=self.dps,
        )
        return d

    def on_start(self, car):
        #todo: создать таск на патроны, который отменит дамаг и сделает
        #todo: проверка на вкл/выкл
        HPTask(owner=car, dps=self.dps).start()
        self.owner.on_start_auto_fire(self)

    def on_end(self, car):
        #todo: создать таск на патроны, который отменит дамаг и сделает
        #todo: проверка на вкл/выкл
        HPTask(owner=car, dps=-self.dps).start()
        self.owner.on_end_auto_fire(self)


class WeaponDischarge(Weapon):
    def __init__(self, dmg=BALANCE.Weapon.dmg, time_recharge=BALANCE.Weapon.time_recharge, **kw):
        super(WeaponDischarge, self).__init__(**kw)
        self.dmg = dmg
        self.last_shoot = None
        self.t_rch = time_recharge

    def as_dict(self, **kw):
        d = super(WeaponDischarge, self).as_dict(**kw)
        d.update(
            dmg=self.dmg,
            time_recharge=self.t_rch,
        )
        return d

    def on_fire(self, cars, time):
        if self.last_shoot is not None:
            if (self.last_shoot + self.t_rch) > time:
                return
        # todo: проверка на патроны
        for car in cars:
            HPTask(owner=car, dhp=self.dmg).start()
        self.last_shoot = time
        self.owner.on_discharge_fire(self)

