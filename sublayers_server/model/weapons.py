# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.balance import BALANCE
from sublayers_server.model.messages import FireAutoEffect


class Weapon(object):
    def __init__(self, owner, sectors, radius=BALANCE.Weapon.radius, width=BALANCE.Weapon.width):
        super(Weapon, self).__init__()
        self.owner = owner
        self.sectors = sectors[:]
        for s in sectors:
            s.add_weapon(self)
        self.radius = radius
        self.width = width

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self, **kw):
        return dict(
            cls=self.classname,
            radius=self.radius,
            width=self.width,
        )


class WeaponAuto(Weapon):
    def __init__(self, dps=BALANCE.Weapon.dps, **kw):
        super(WeaponAuto, self).__init__(**kw)
        self.targets = []
        self.dps = dps
        self._enable = False

    def as_dict(self, **kw):
        d = super(WeaponAuto, self).as_dict(**kw)
        d.update(
            dps=self.dps,
            enable=self._enable,
        )
        return d

    def _start(self, car, time):
        #todo: создать таск на патроны, который отменит дамаг и сделает стоп стрельбы
        self.targets.append(car)
        car.set_hp(dps=self.dps, add_shooter=self.owner, time=time)
        for agent in self.owner.subscribed_agents:
            FireAutoEffect(agent=agent, subj=self.owner, obj=car, side=self.sectors[0].side, action=True).post()

    def _end(self, car, time):
        # todo: остановить списывание патронов пулемёта
        self.targets.remove(car)
        if not car.is_died(time=time):  # если цель мертва, то нет смысла снимать с неё дамаг
            car.set_hp(dps=-self.dps, del_shooter=self.owner, time=time)
        for agent in self.owner.subscribed_agents:
            FireAutoEffect(agent=agent, subj=self.owner, obj=car, side=self.sectors[0].side, action=False).post()

    def start(self, car, time):
        if self._enable:
            self._start(car=car, time=time)

    def end(self, car, time):
        if self._enable:
            self._end(car=car, time=time)

    def set_enable(self, time, enable=True, cars=None):
        if self._enable == enable:
            return
        self._enable = enable
        if cars:
            for car in cars:
                if enable:
                    self._start(car=car, time=time)
                else:
                    self._end(car=car, time=time)

    def get_enable(self):
        return self._enable


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
        if self.can_fire(time=time):
            for car in cars:
                car.set_hp(dhp=self.dmg, shooter=self.owner, time=time)
            self.last_shoot = time
            return self.t_rch
        return 0

    def can_fire(self, time):
        return (self.last_shoot is None) or (self.last_shoot + self.t_rch <= time)