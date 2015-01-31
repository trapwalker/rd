# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from state import State
from hp_state import HPState
from base import Observer
from balance import BALANCE
from math import pi
from motion_task import MotionTask
from hp_task import HPTask
from sectors import FireSector
from weapons import WeaponDischarge, WeaponAuto
from events import FireDischargeEvent, FireAutoEnableEvent
from effects_zone import EffectRoad, EffectWater, EffectWood
import messages


class Unit(Observer):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self, owner=None, max_hp=None, direction=-pi/2, defence=BALANCE.Unit.defence, weapons=None,
                 role=None, **kw):
        """
        @param sublayers_server.model.agents.Agent owner: Object owner
        @param float max_hp: Maximum health level
        @param float direction: Direction angle of unit
        @param list[sublayers_server.model.weapons.weapon] weapons: Set of weapon
        @param sublayers_server.model.party.Role role: role of unit into the party of agent
        """
        super(Unit, self).__init__(**kw)
        self.role = role
        self.owner = owner
        t = self.server.get_time()
        self.hp_state = HPState(t=t, max_hp=max_hp, hp=max_hp, dps=0.0)
        self._direction = direction
        self.zones = []
        self.effects = []
        self.tasks = []
        """@type: list[sublayers_server.model.tasks.Task]"""
        self.fire_sectors = []
        """@type: list[sublayers_server.model.sectors.FireSector]"""
        for weapon in weapons:
            self.setup_weapon(dict_weapon=weapon)

    @property
    def direction(self):
        """
        @rtype: float
        """
        return self._direction

    @direction.setter
    def direction(self, value):
        self._direction = value

    @property
    def is_died(self):
        return self.hp_state.hp(self.server.get_time()) <= 0.0

    @property
    def hp(self):
        return self.hp_state.hp(self.server.get_time())

    def hp_by_time(self, t=None):
        t = t if t is not None else self.server.get_time()
        return self.hp_state.hp(t)

    def setup_weapon(self, dict_weapon):
        sector = FireSector(owner=self, radius=dict_weapon['radius'], width=dict_weapon['width'], fi=dict_weapon['fi'])
        if dict_weapon['is_auto']:
            WeaponAuto(owner=self, sectors=[sector], radius=dict_weapon['radius'], width=dict_weapon['width'],
                       dps=dict_weapon['dps'])
        else:
            WeaponDischarge(owner=self, sectors=[sector], radius=dict_weapon['radius'], width=dict_weapon['width'],
                            dmg=dict_weapon['dmg'], time_recharge=dict_weapon['time_recharge'])

    def is_target(self, target):
        # todo: проверить объект на партийность
        return isinstance(target, Unit)

    def takeoff_weapon(self, weapon):
        # todo: продумать меанизм снятия оружия
        pass

    def fire_discharge(self, side):
        FireDischargeEvent(obj=self, side=side).post()

    def fire_auto_enable(self, side, enable):
        FireAutoEnableEvent(obj=self, side=side, enable=enable).post()

    def on_fire_discharge(self, event):
        time = event.time
        side = event.side
        # сначала проверяем можем ли мы стрельнуть бортом
        for sector in self.fire_sectors:
            if sector.side == side:
                if not sector.can_discharge_fire(time=time):
                    # todo: отправить на клиент сообщение о том, что орудия ещё в перезарядке
                    return
        t_rch = 0
        for sector in self.fire_sectors:
            if sector.side == side:
                t_rch = max(t_rch, sector.fire_discharge(time=time))
        # todo: отправить на клиент маскимальную перезарядку данного борта (нельзя всем отправлять свою перезарядку! НЕЛЬЗЯ) !!!!
        # todo:  нужно отправить всем сообщение о выстреле
        # для себя: side, time, t_rch
        if t_rch > 0.0:
            # значит выстрел всё-таки был произведён. Отправить на клиенты для отрисовки
            for agent in self.watched_agents:
                messages.FireDischarge(
                    agent=agent,
                    side=side,
                    t_rch=t_rch,
                ).post()

    def on_fire_auto_enable(self, event):
        side = event.side
        enable = event.enable
        for sector in self.fire_sectors:
            if sector.side == side:
                sector.enable_auto_fire(enable=enable)

    def contact_test(self, obj):
        super(Unit, self).contact_test(obj=obj)
        for sector in self.fire_sectors:
            if sector.is_auto:
                sector.fire_auto(target=obj)
        # зонирование
        self.server.ts_zone.test_zones(obj=self)

    def on_contact_out(self, time, obj, **kw):
        super(Unit, self).on_contact_out(time=time, obj=obj, **kw)
        for sector in self.fire_sectors:
            sector.out_car(target=obj)

    def on_die(self, event):
        super(Unit, self).on_die(event)
        # перестать стрелять своими автоматическими секторами
        self.fire_auto_enable(side='front', enable=False)
        self.fire_auto_enable(side='back', enable=False)
        self.fire_auto_enable(side='left', enable=False)
        self.fire_auto_enable(side='right', enable=False)
        # todo: удалить себя и на этом месте создать обломки
        self.delete()

    def as_dict(self, to_time=None):
        d = super(Unit, self).as_dict(to_time=to_time)
        owner = self.owner
        d.update(
            owner=owner and owner.as_dict(),
            direction=self.direction,
            hp_state=self.hp_state.export(),
            fire_sectors=[sector.as_dict() for sector in self.fire_sectors],
            role=None if self.role is None else self.role.name,
        )
        return d

    def on_before_delete(self, **kw):
        super(Unit, self).on_before_delete(**kw)
        if self.role:
            self.role.remove_car(self)
            # todo: rename
        for task in self.tasks:
            if isinstance(task, HPTask):
                task.done()

    def in_zone(self, zone):
        if zone in self.zones:
           return
        self.zones.append(zone)
        if zone == 'wood':
            EffectWood(owner=self).start()
        elif zone == 'road':
            EffectRoad(owner=self).start()
        elif zone == 'water':
            EffectWater(owner=self).start()

    def out_zone(self, zone):
        if not (zone in self.zones):
            return
        self.zones.remove(zone)
        # определить класс отменяемых эффектов
        zone_class = None
        if zone == 'wood':
            zone_class = EffectWood
        elif zone == 'road':
            zone_class = EffectRoad
        elif zone == 'water':
            zone_class = EffectWater

        assert zone_class
        for effect in self.effects:
            if isinstance(effect, zone_class):
                effect.done()


class Station(Unit):
    u"""Class of buildings"""

    def __init__(self, max_hp=BALANCE.Station.max_hp, observing_range=BALANCE.Station.observing_range, **kw):
        super(Station, self).__init__(max_hp=max_hp, observing_range=observing_range, **kw)


class Mobile(Unit):
    u"""Class of mobile units"""

    def __init__(self,
                 max_hp=BALANCE.Bot.max_hp,
                 observing_range=BALANCE.Bot.observing_range,
                 max_velocity=BALANCE.Bot.velocity,
                 **kw):
        super(Mobile, self).__init__(max_hp=max_hp, observing_range=observing_range, **kw)
        self._max_velocity = max_velocity
        t = self.server.get_time()
        self.state = State(owner=self, t=t, **self.init_state_params())
        self.cur_motion_task = None
        # todo: test to excess update-message after initial contact-message

    def init_state_params(self):
        return dict(
            p=self._position,
            fi=self._direction,
            v_max=self._max_velocity,
            # todo: acc and velocity constrains and params
        )

    def as_dict(self, to_time=None):
        if not to_time:
            to_time = self.server.get_time()
        d = super(Mobile, self).as_dict(to_time=to_time)
        d.update(
            state=self.state.export(),
            max_velocity=self.max_velocity,
        )
        return d

    def on_init(self, event):
        self.contacts_check_interval = 0.5  # todo: optimize. Regular in motion only
        super(Mobile, self).on_init(event)

    def on_start(self, event):
        pass

    def on_stop(self, event):
        pass

    def set_motion(self, position=None, cc=None, turn=None):
        assert (turn is None) or (position is None)
        MotionTask(owner=self, target_point=position, cc=cc, turn=turn).start()

    def on_before_delete(self,  **kw):
        super(Mobile, self).on_before_delete(**kw)
        for task in self.tasks:
            if isinstance(task, MotionTask):
                task.done()

    @property
    def v(self):
        """
        Velocity vector

        @rtype: sublayers_server.model.vectors.Point
        """
        return self.state.v(t=self.server.get_time())

    @Unit.position.getter
    def position(self):
        """
        @rtype: sublayers_server.model.vectors.Point
        """
        return self.state.p(t=self.server.get_time())

    @Unit.direction.getter
    def direction(self):
        """
        @rtype: float
        """
        return self.state.fi(t=self.server.get_time())

    @property
    def max_velocity(self):  # m/s
        """
        @rtype: float
        """
        return self._max_velocity

    @max_velocity.setter
    def max_velocity(self, value):
        self._max_velocity = value


class Bot(Mobile):
    pass
