# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from balance import BALANCE
from hp_task import HPTask


class Weapon(object):
    def __init__(self, owner, sectors, radius=BALANCE.Weapon.radius, width=BALANCE.Weapon.width):
        super(Weapon, self).__init__()
        self.owner = owner
        self.sectors = sectors[:]
        for s in sectors:
            s.add_weapon(self)
        self.radius = radius
        self.width = width

    def as_dict(self, **kw):
        return dict(
            cls=self.__class__.__name__,
            radius=self.radius,
            width=self.width,
        )


class WeaponAuto(Weapon):
    def __init__(self, dps=BALANCE.Weapon.dps, **kw):
        super(WeaponAuto, self).__init__(**kw)
        self.dps = dps
        self._enable = False

    def as_dict(self, **kw):
        d = super(WeaponAuto, self).as_dict(**kw)
        d.update(
            dps=self.dps,
            enable=self._enable,
        )
        return d

    def _start(self, car):
        #todo: создать таск на патроны, который отменит дамаг и сделает стоп стрельбы
        HPTask(owner=car, dps=self.dps).start()
        self.owner.on_start_auto_fire(self)

    def _end(self, car):
        if not car.is_died:  # если цель мертва, то нет смысла снимать с неё дамаг, но прекратить его нужно
            HPTask(owner=car, dps=-self.dps).start()
        self.owner.on_end_auto_fire(self)

    def start(self, car):
        if self._enable:
            self._start(car)

    def end(self, car):
        if self._enable:
            self._end(car)

    def set_enable(self, enable=True, cars=None):
        if self._enable == enable:
            return
        self._enable = enable
        if cars:
            for car in cars:
                if enable:
                    self._start(car)
                else:
                    self._end(car)
        # todo: возможно отправить на клиент какое-то сообщение о включённых орудиях


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

    def fire(self, cars, time):
        # todo: добавить проверку на патроны
        log.debug('---------------------HERE !!! SHOOT !!!! %s', len(cars))
        if self.can_fire(time=time) and cars:
            for car in cars:
                HPTask(owner=car, dhp=self.dmg).start()
            self.last_shoot = time
            return self.t_rch
        return 0

    def can_fire(self, time):
        if self.last_shoot:
            log.debug('---------------------t_rch + time = %s', self.last_shoot + self.t_rch)
        return (self.last_shoot is None) or (self.last_shoot + self.t_rch <= time)