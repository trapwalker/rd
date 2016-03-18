# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.messages import FireAutoEffect, FireDischarge
from sublayers_server.model.inventory import Consumer
from sublayers_server.model.events import FireDischargeEffectEvent

from random import random


class Weapon(Consumer):
    def __init__(self, owner, sector, example, items_cls_list, swap=False, **kw):
        super(Weapon, self).__init__(server=owner.server, **kw)
        self.items_cls_list = items_cls_list
        self.swap = swap
        self.owner = owner
        self.sector = sector
        self.example = example
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

    def can_set(self, item):
        return item.example.parent in self.items_cls_list

    def on_empty_item(self, item, time, action):
        balance_cls_list = []
        if self.swap:
            balance_cls_list = self.items_cls_list
        else:
            balance_cls_list = [item.example.parent]
        new_item = item.inventory.get_item_by_cls(balance_cls_list=balance_cls_list, time=time, min_value=-self.dv)
        self.set_item(time=time, item=new_item, action=action)

    def add_car(self, car, time):
        pass

    def del_car(self, car, time):
        pass


class WeaponAuto(Weapon):
    def __init__(self, dps, **kw):
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
        if self.is_enable:  # если оружию разрешено вести стрельбу
            if not self.is_call_start:  # если ещё не вызывался старт ведения стрельбы
                if not self.is_started:  # если стрельба ещё не началась
                    self.start(time=time)  # вызвать начало стрельбы по всем таргетам в таргет листе
                else:
                    self._start_fire_to_car(car=car, time=time)  # вызвать начало стрельбы по данному таргету
                    if self.is_call_stop:
                        self.start(time=time)

    def del_car(self, car, time):
        if self.is_started:
            if len(self.sector.target_list) == 0:
                self.stop(time=time)
            self._stop_fire_to_car(car=car, time=time)

    def _start_fire_to_car(self, car, time):
        car.set_hp(dps=self.dps, add_shooter=self.owner, time=time)
        self.targets.append(car)
        for agent in self.owner.subscribed_agents:
            FireAutoEffect(agent=agent, subj=self.owner, obj=car, side=self.sector.side, action=True, time=time).post()

    def _stop_fire_to_car(self, car, time):
        if not car.is_died(time=time):  # если цель мертва, то нет смысла снимать с неё дамаг
            car.set_hp(dps=-self.dps, del_shooter=self.owner, time=time)
        self.targets.remove(car)
        for agent in self.owner.subscribed_agents:
            FireAutoEffect(agent=agent, subj=self.owner, obj=car, side=self.sector.side, action=False, time=time).post()

    def on_start(self, item, time):
        super(WeaponAuto, self).on_start(item=item, time=time)
        for car in self.sector.target_list:
            self._start_fire_to_car(car=car, time=time)

    def on_stop(self, item, time):
        super(WeaponAuto, self).on_stop(item=item, time=time)
        targets = self.targets[:]
        for car in targets:
            self._stop_fire_to_car(car=car, time=time)

    def set_enable(self, time, enable):
        if self.is_enable == enable:
            return
        self.is_enable = enable
        if not enable and self.is_started:
            self.stop(time=time)

    def get_enable(self):
        return self.is_enable


class WeaponDischarge(Weapon):
    def __init__(self, dmg, area_dmg, time_recharge, **kw):
        super(WeaponDischarge, self).__init__(**kw)
        self.dmg = dmg
        self.area_dmg = area_dmg
        self.last_shoot = None
        self.t_rch = time_recharge

        # сразу запоминаем шанс крита и силу крита, чтобы потом при каждом выстреле не пересчитывать
        self.crit_rate = 0.0
        self.crit_power = 0.0
        mobile_ex = self.owner.example
        agent_ex = None if self.owner.owner is None else self.owner.owner.example
        if mobile_ex is not None and hasattr(mobile_ex, 'get_modify_value'):
            self.crit_rate = mobile_ex.get_modify_value(param_name='crit_rate', example_agent=agent_ex)
            self.crit_power = mobile_ex.get_modify_value(param_name='crit_power', example_agent=agent_ex)

    def as_dict(self, **kw):
        d = super(WeaponDischarge, self).as_dict(**kw)
        d.update(
            dmg=self.dmg,
            time_recharge=self.t_rch,
        )
        return d

    def calc_dmg(self):
        # определяем, прошёл ли крит
        is_crit = random() < self.crit_rate
        return self.dmg * (1 + (1.0 if is_crit else 0.0) * self.crit_power), is_crit

    def fire(self, time):
        if self.can_fire(time=time):
            self.use(time=time)

    def on_use(self, item, time):
        super(WeaponDischarge, self).on_use(item=item, time=time)
        # Выстрел произошёл. патроны списаны. Списать ХП и отправить на клиент инфу о перезарядке
        self.last_shoot = time
        dmg, is_crit = self.calc_dmg()
        for car in self.sector.target_list:
            car.set_hp(dhp=dmg, shooter=self.owner, time=time)

        for car in self.sector.area_target_list:
            car.set_hp(dhp=self.area_dmg, shooter=self.owner, time=time)

        if is_crit:
            # todo: Отправить сообщение self.owner о том, что произошёл критический выстрел
            # log.debug('Crrriiiiiiiiiiiiiiiiiiiiiiit = %s', dmg)
            pass

        # евент залповая стрельба
        FireDischargeEffectEvent(obj=self.owner, side=self.sector.side, time=time).post()

        # отправка сообщения агентам о перезарядке
        for agent in self.owner.watched_agents:
            FireDischarge(
                agent=agent,
                side=self.sector.side,
                t_rch=self.t_rch,
                time=time,
                car_id=self.owner.uid
            ).post()

    def can_fire(self, time):
        return (self.last_shoot is None) or (self.last_shoot + self.t_rch <= time)