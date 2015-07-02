# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.balance import BALANCE
from sublayers_server.model.messages import FireAutoEffect
from sublayers_server.model.inventory import Consumer



class Weapon(Consumer):
    def __init__(self, owner, sector, items_cls_list=BALANCE.Weapon.items_cls_list, dv=BALANCE.Weapon.dv,
                 ddvs=BALANCE.Weapon.ddvs):
        super(Weapon, self).__init__(items_cls_list=items_cls_list, dv=dv, ddvs=ddvs)
        self.owner = owner
        self.sector = sector
        sector.add_weapon(self)

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self, **kw):
        return dict(
            cls=self.classname,
            radius=self.sector.radius,
            width=self.sector.width,
        )

    def add_car(self, car, time):
        pass

    def del_car(self, car, time):
        pass


class WeaponAuto(Weapon):
    def __init__(self, dps=BALANCE.Weapon.dps, **kw):
        super(WeaponAuto, self).__init__(**kw)
        self.targets = []
        self.dps = dps
        self.is_enable = False

    def as_dict(self, **kw):
        d = super(WeaponAuto, self).as_dict(**kw)
        d.update(
            dps=self.dps,
            enable=self.is_enable,
        )
        return d

    def add_car(self, car, time):
        if self.is_enable:
            if not self.is_started:
                self.start(time=time)
            else:
                self._start_fire_to_car(car=car, time=time)

    def del_car(self, car, time):
        if self.is_enable and self.is_started:
            self._stop_fire_to_car(car=car, time=time)
            if len(self.sector.target_list) == 0:
                self.stop(time=time)

    def _start_fire_to_car(self, car, time):
        car.set_hp(dps=self.dps, add_shooter=self.owner, time=time)
        for agent in self.owner.subscribed_agents:
            FireAutoEffect(agent=agent, subj=self.owner, obj=car, side=self.sector.side, action=True, time=time).post()

    def _stop_fire_to_car(self, car, time):
        if not car.is_died(time=time):  # если цель мертва, то нет смысла снимать с неё дамаг
            car.set_hp(dps=-self.dps, del_shooter=self.owner, time=time)
        for agent in self.owner.subscribed_agents:
            FireAutoEffect(agent=agent, subj=self.owner, obj=car, side=self.sector.side, action=False, time=time).post()

    def on_start(self, item, time):
        super(WeaponAuto, self).on_start(item=item, time=time)
        for car in self.sector.target_list:
            self._start_fire_to_car(car=car, time=time)

    def on_stop(self, item, time):
        super(WeaponAuto, self).on_stop(item=item, time=time)
        for car in self.sector.target_list:
            self._stop_fire_to_car(car=car, time=time)

    def set_enable(self, time, enable):
        if self.is_enable == enable:
            return
        self.is_enable = enable
        if enable and (len(self.sector.target_list) > 0):
            assert not self.is_started
            self.start(time=time)
        if not enable and self.is_started:
            self.stop(time=time)

    def get_enable(self):
        return self.is_enable


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

    def fire(self, time):
        if self.can_fire(time=time):
            self.use(time=time)
            self.last_shoot = time
            return self.t_rch
        return 0

    def on_use(self, item, time):
        super(WeaponDischarge, self).on_use(item=item, time=time)
        for car in self.sector.target_list:
            car.set_hp(dhp=self.dmg, shooter=self.owner, time=time)

    def can_fire(self, time):
        return (self.last_shoot is None) or (self.last_shoot + self.t_rch <= time)