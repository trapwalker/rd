# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.balance import BALANCE
from sublayers_server.model.messages import FireAutoEffect, FireDischarge
from sublayers_server.model.inventory import Consumer
from sublayers_server.model.events import FireDischargeEffectEvent



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
        self.call_start = False  # Равна True, если start уже вызван, но on_start ещё не было

    def as_dict(self, **kw):
        d = super(WeaponAuto, self).as_dict(**kw)
        d.update(
            dps=self.dps,
            enable=self.is_enable,
        )
        return d

    def start(self, time):
        super(WeaponAuto, self).start(time=time)
        self.call_start = True

    def add_car(self, car, time):
        if self.is_enable:  # если оружию разрешено вести стрельбу
            if not self.call_start:  # если ещё не вызывался старт ведения стрельбы
                if not self.is_started:  # если стрельба ещё не началась
                    self.start(time=time)  # вызвать начало стрельбы по всем таргетам в таргет листе
                else:
                    self._start_fire_to_car(car=car, time=time)  # вызвать начало стрельбы по данному таргету

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
        self.call_start = False  # сделать False, так как уже on_start произошёл и отсеивать другие страрты не нужно
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

    def on_use(self, item, time):
        super(WeaponDischarge, self).on_use(item=item, time=time)
        # Выстрел произошёл. патроны списаны. Списать ХП и отправить на клиент инфу о перезарядке
        self.last_shoot = time
        for car in self.sector.target_list:
            car.set_hp(dhp=self.dmg, shooter=self.owner, time=time)

        # евент залповая стрельба
        FireDischargeEffectEvent(obj=self.owner, side=self.sector.side, time=time).post()

        # отправка сообщения агентам о перезарядке
        for agent in self.owner.watched_agents:
            FireDischarge(
                agent=agent,
                side=self.sector.side,
                t_rch=self.t_rch,
                time=time
            ).post()


    def can_fire(self, time):
        return (self.last_shoot is None) or (self.last_shoot + self.t_rch <= time)