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
from events import FireDischargeEvent, FireAutoEnableEvent, FireDischargeEffectEvent
from parameters import Parameter
from effects_zone import EffectDirt
import messages


class Unit(Observer):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self,
                 owner=None,
                 max_hp=BALANCE.Unit.max_hp,
                 direction=BALANCE.Unit.direction,
                 defence=BALANCE.Unit.defence,
                 weapons=None,
                 role=None,
                 **kw):
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
        time = self.server.get_time()
        self.hp_state = HPState(t=time, max_hp=max_hp, hp=max_hp, dps=0.0)
        self._direction = direction
        self.zones = []
        self.effects = []
        EffectDirt(owner=self).start()
        self.tasks = []
        """@type: list[sublayers_server.model.tasks.Task]"""
        self.fire_sectors = []
        """@type: list[sublayers_server.model.sectors.FireSector]"""
        if weapons:
            for weapon in weapons:
                self.setup_weapon(dict_weapon=weapon)

        # Параметры Unit'а


        # Резисты Unit'а


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
                    return
        t_rch = 0
        for sector in self.fire_sectors:
            if sector.side == side:
                t_rch = max(t_rch, sector.fire_discharge(time=time))

        # для себя: side, time, t_rch
        if t_rch > 0.0:
            # евент залповая стрельба
            FireDischargeEffectEvent(obj=self, side=side).post()
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
            if sector.is_auto():
                sector.fire_auto(target=obj)
        # зонирование
        for zone in self.server.zones:
            zone.test_in_zone(obj=self)

    def on_contact_in(self, obj, **kw):
        super(Unit, self).on_contact_in(obj=obj, **kw)
        if isinstance(obj, Unit):
            for agent in self.watched_agents:
                for shooter in obj.hp_state.shooters:
                    messages.FireAutoEffect(agent=agent, subj=shooter, obj=obj, action=True).post()
                for sector in obj.fire_sectors:
                    for weapon in sector.weapon_list:
                        if isinstance(weapon, WeaponAuto):
                            for target in weapon.targets:
                                messages.FireAutoEffect(agent=agent, subj=obj, obj=target, action=True, side=sector.side).post()

    def on_contact_out(self, obj, **kw):
        super(Unit, self).on_contact_out(obj=obj, **kw)
        for sector in self.fire_sectors:
            sector.out_car(target=obj)
        if isinstance(obj, Unit):
            for agent in self.watched_agents:
                for shooter in obj.hp_state.shooters:
                    messages.FireAutoEffect(agent=agent, subj=shooter, obj=obj, action=False).post()
                for sector in obj.fire_sectors:
                    for weapon in sector.weapon_list:
                        if isinstance(weapon, WeaponAuto):
                            for target in weapon.targets:
                                messages.FireAutoEffect(agent=agent, subj=obj, obj=target, action=False, side=sector.side).post()

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


class Station(Unit):
    u"""Class of buildings"""

    def __init__(self, max_hp=BALANCE.Station.max_hp, observing_range=BALANCE.Station.observing_range, **kw):
        super(Station, self).__init__(max_hp=max_hp, observing_range=observing_range, **kw)


class Mobile(Unit):
    u"""Class of mobile units"""

    def __init__(self,
                 r_min=BALANCE.Mobile.r_min,
                 ac_max=BALANCE.Mobile.ac_max,
                 v_max=BALANCE.Mobile.v_max,
                 a_accelerate=BALANCE.Mobile.a_accelerate,
                 a_braking=BALANCE.Mobile.a_braking,
                 max_control_speed=BALANCE.Mobile.max_control_speed,
                 **kw):
        super(Mobile, self).__init__(**kw)
        time = self.server.get_time()
        self.state = State(owner=self, t=time, **self.init_state_params(r_min=r_min,
                                                                        ac_max=ac_max,
                                                                        v_max=v_max,
                                                                        a_accelerate=a_accelerate,
                                                                        a_braking=a_braking))
        self.cur_motion_task = None
        # todo: test to excess update-message after initial contact-message
        # Parametrs
        self.p_cc = Parameter(original=1.0)  # todo: вычислить так: max_control_speed / v_max

    def init_state_params(self, r_min, ac_max, v_max, a_accelerate, a_braking):
        return dict(
            p=self._position,
            fi=self._direction,
            v_max=v_max,
            r_min=r_min,
            ac_max=ac_max,
            a_accelerate=a_accelerate,
            a_braking=a_braking,
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
        return self.state.v_max


class Bot(Mobile):
    pass
