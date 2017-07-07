# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.messages import FireAutoEffect, FireDischarge
from sublayers_server.model.game_log_messages import WeaponAmmoFinishedLogMessage
from sublayers_server.model.inventory import Consumer
from sublayers_server.model.events import Event, FireDischargeEffectEvent, event_deco
from sublayers_server.model.quest_events import OnMakeDmg


from random import random

import traceback


class Weapon(Consumer):
    def __init__(self, owner, sector, example, items_cls_list, swap=False, **kw):
        super(Weapon, self).__init__(server=owner.server, **kw)
        self.items_cls_list = items_cls_list
        self.swap = swap
        self.owner = owner
        self.sector = sector
        self.example = example
        sector.add_weapon(self)

        self.last_item_balance_cls = None  # Последний закончившийся итем.

    @property
    def classname(self):
        return self.__class__.__name__

    def __str__(self):
        return '{}---{}'.format(self.classname, self.sector)

    def calc_dmg_rate(self, car, time):
        power_dif = car.params.get('p_armor').value - self.example.power_penetration
        if power_dif <= 0:
            return 1.0
        elif power_dif >= 10:
            return 0.0
        else:
            return (10. - power_dif) / 10.

    def as_dict(self, **kw):
        return dict(
            cls=self.classname,
            radius=self.sector.radius,
            width=self.sector.width,
        )

    def can_set(self, item):
        return item.example.parent in self.items_cls_list

    def on_empty_item(self, item, time, action):
        owner = None if self.owner is None or self.owner.owner is None else self.owner.owner
        if owner:
            owner.log.info('on_empty item <{}> for consumer <{}> time={}'.format(item, self, time))

        balance_cls_list = []
        self.last_item_balance_cls = item.example.parent
        if self.swap:
            balance_cls_list = self.items_cls_list
        else:
            balance_cls_list = [item.example.parent]
        new_item = item.inventory.get_item_by_cls(balance_cls_list=balance_cls_list, time=time, min_value=-self.dv)
        self.set_item(time=time, item=new_item, action=action)
        # Отправить сообщение если можно о том, что закончились патроны
        if self.item is None and self.owner.owner:
            WeaponAmmoFinishedLogMessage(agent=self.owner.owner, time=time, weapon=self).post()
        else:
            if owner:
                owner.log.info('new_item_set item <{}> consumer <{}> time={}'.format(self.item, self, time))

    @event_deco
    def try_recharge(self, event, inventory):
        item = inventory.get_item_by_cls(balance_cls_list=[self.last_item_balance_cls], time=event.time, min_value=-self.dv)
        if item is not None:
            self.set_item(item=item, time=event.time)

    def add_car(self, car, time):
        pass

    def del_car(self, car, time):
        pass


class WeaponAuto(Weapon):
    def __init__(self, dps, **kw):
        super(WeaponAuto, self).__init__(**kw)
        self.targets = []
        self.dps_list = {}
        self.dps = dps
        self.is_enable = False
        self.current_dps = 0

    def as_dict(self, **kw):
        d = super(WeaponAuto, self).as_dict(**kw)
        d.update(
            dps=self.dps,
            enable=self.is_enable,
        )
        return d

    def get_dps(self, car, time):
        return self.dps * self.calc_dmg_rate(car=car, time=time)

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
        if self.is_started or self.is_call_start:
            if len(self.sector.target_list) == 0:
                self.stop(time=time)
        if self.is_started:
            self._stop_fire_to_car(car=car, time=time)

    def restart_fire_to_car(self, car, time):
        self._stop_fire_to_car(car, time=time)
        self._start_fire_to_car(car, time=time)

    def _start_fire_to_car(self, car, time):
        dps = self.get_dps(car=car, time=time)
        owner = None if self.owner is None or self.owner.owner is None else self.owner.owner

        if owner:
            owner.log.info('_start_fire_to_car: car<{}> time={}'.format(car, time))

        # assert car not in self.targets, '{} in weapon.targets weapon_owner={}  car_owner={}'.format(car, owner, car.main_agent)
        if car in self.targets:
            log.warning('Error ! {} in weapon.targets weapon_owner={}  car_owner={}  time={}'.format(car, owner, car.main_agent, time))
            if owner:
                owner.log.info('Error ! {} in weapon.targets weapon_owner={}  car_owner={}  time={}'.format(car, owner, car.main_agent, time))
            log.debug(''.join(traceback.format_stack()))
            old_dps = self.dps_list.get(car.id, None)
            assert old_dps == dps, 'old_dps == {}    dps={}'.format(old_dps, dps)

        car.set_hp(dps=dps, add_shooter=self.owner, time=time, add_weapon=self)
        self.targets.append(car)
        self.dps_list[car.id] = dps
        for agent in self.owner.subscribed_agents:
            FireAutoEffect(agent=agent, subj=self.owner, obj=car, weapon=self, sector=self.sector, action=True, time=time).post()
        self.owner.on_autofire_start(target=car, time=time)
        self.owner.main_agent.example.profile.on_event(event=Event(server=self.owner.server, time=time), cls=OnMakeDmg)

    def _stop_fire_to_car(self, car, time):
        # assert car in self.targets, 'Error: car<{}> not in targets<{}>'.format(car, self.targets)
        owner = None if self.owner is None or self.owner.owner is None else self.owner.owner

        if owner:
            owner.log.info('_stop_fire_to_car: car<{}> time={}'.format(car, time))

        if car not in self.targets and self.dps_list.get(car.id, None) is None:
            log.debug(''.join(traceback.format_stack()))
            log.warning('Error _stop_fire_to_car: car<{}> not in targets<{}>, but car not in dps_list time={}'.format(car, self.targets, time))
            if owner:
                owner.log.info('Error _stop_fire_to_car: car<{}> not in targets<{}>, but car not in dps_list time={}'.format(car, self.targets, time))
            return

        if car not in self.targets and self.dps_list.get(car.id, None) is not None:
            log.debug(''.join(traceback.format_stack()))
            log.warning('Error _stop_fire_to_car: car<{}> not in targets<{}>, but car in dps_list time={}'.format(car, self.targets, time))
            if owner:
                owner.log.info('Error _stop_fire_to_car: car<{}> not in targets<{}>, but car in dps_list time={}'.format(car, self.targets, time))
            if not car.is_died(time=time):  # Просто снять дамаг
                car.set_hp(dps=-self.dps_list[car.id], del_shooter=self.owner, time=time, del_weapon=self)
            return

        if not car.is_died(time=time):  # если цель мертва, то нет смысла снимать с неё дамаг
            car.set_hp(dps=-self.dps_list[car.id], del_shooter=self.owner, time=time, del_weapon=self)
        self.targets.remove(car)
        if car not in self.targets:
            del self.dps_list[car.id]
        else:
            log.warning('Error _stop_fire_to_car: Delete car<{}> from targets<{}>, but car in targets time={}'.format(car, self.targets, time))
            if owner:
                owner.log.info('Error _stop_fire_to_car: Delete car<{}> from targets<{}>, but car in targets time={}'.format(car, self.targets, time))
            log.debug(''.join(traceback.format_stack()))
        for agent in self.owner.subscribed_agents:
            FireAutoEffect(agent=agent, subj=self.owner, obj=car, weapon=self, sector=self.sector, action=False, time=time).post()

    def on_start(self, item, time):
        owner = None if self.owner is None or self.owner.owner is None else self.owner.owner
        if owner:
            owner.log.info('on_start {}: item<{}> time={} len_sector_targets={}'.format(self, item, time, len(self.sector.target_list)))
        super(WeaponAuto, self).on_start(item=item, time=time)
        for car in self.sector.target_list:
            if car not in self.targets:
                self._start_fire_to_car(car=car, time=time)

    def on_stop(self, item, time):
        owner = None if self.owner is None or self.owner.owner is None else self.owner.owner
        if owner:
            owner.log.info('on_stop {}: item<{}> time={} len_targets={}'.format(self, item, time, len(self.targets)))

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

    def set_item(self, time, **kw):
        super(WeaponAuto, self).set_item(time=time, **kw)
        # снова включить стрельбу для этого оружия, если оно не стреляет! Список целей есть только в секторе
        if len(self.targets) == 0:
            for target in self.sector.target_list:
                 self.add_car(car=target, time=time)


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

        param_dict = self.owner._param_aggregate
        if param_dict is not None:
            self.crit_rate = param_dict.get('crit_rate', self.crit_rate)
            self.crit_power = param_dict.get('crit_power', self.crit_power)

    def as_dict(self, **kw):
        d = super(WeaponDischarge, self).as_dict(**kw)
        d.update(
            dmg=self.dmg,
            time_recharge=self.t_rch,
        )
        return d

    def calc_is_crit(self):
        return random() < self.crit_rate

    def calc_dmg(self, car, is_crit, time):
        # Крит игнорирует броню
        if is_crit:
            return self.dmg * (1 + self.crit_power)
        return self.dmg * self.calc_dmg_rate(car=car, time=time)

    def calc_area_dmg(self, car, time):
        return self.area_dmg * self.calc_dmg_rate(car=car, time=time)

    def fire(self, time):
        if self.can_fire(time=time):
            self.use(time=time)

    def on_use(self, item, time):
        super(WeaponDischarge, self).on_use(item=item, time=time)
        if self.owner.limbo or not self.owner.is_alive:
            log.debug('Rare Situation! {} try fire_discharge in limbo'.format(self.owner))
            return
        # Выстрел произошёл. патроны списаны. Списать ХП и отправить на клиент инфу о перезарядке
        self.last_shoot = time
        is_crit = self.calc_is_crit()
        is_damage_shoot = False

        for car in self.sector.target_list:
            dmg = self.calc_dmg(car=car, is_crit=is_crit, time=time)
            car.set_hp(dhp=dmg, shooter=self.owner, time=time)
            is_damage_shoot = True

        for car in self.sector.area_target_list:
            dmg = self.calc_area_dmg(car=car, time=time)
            car.set_hp(dhp=dmg, shooter=self.owner, time=time)
            is_damage_shoot = True

        if is_crit:
            # todo: Отправить сообщение self.owner о том, что произошёл критический выстрел
            pass

        # евент залповая стрельба
        FireDischargeEffectEvent(obj=self.owner, side=self.sector.side, weapon_example=self.example, time=time).post()

        # отправка сообщения агентам о перезарядке
        for agent in self.owner.watched_agents:
            FireDischarge(
                agent=agent,
                side=self.sector.side,
                t_rch=self.t_rch,
                time=time,
                car_id=self.owner.uid
            ).post()

        self.owner.on_discharge_shoot(targets=self.sector.target_list, is_damage_shoot=is_damage_shoot, time=time)

    def can_fire(self, time):
        return (self.last_shoot is None) or (self.last_shoot + self.t_rch <= time)