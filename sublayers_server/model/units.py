# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.state import State, MotionState
from sublayers_server.model.hp_state import HPState
from sublayers_server.model.base import Observer
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.motion_task import MotionTask
from sublayers_server.model.hp_task import HPTask
from sublayers_server.model.sectors import FireSector
from sublayers_server.model.weapons import WeaponDischarge, WeaponAuto
from sublayers_server.model.events import FireDischargeEvent, FireAutoEnableEvent, FireDischargeEffectEvent, SearchZones
from sublayers_server.model.parameters import Parameter
from sublayers_server.model.effects_zone import EffectDirt
from sublayers_server.model import messages

from math import pi


class Unit(Observer):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self,
                 owner=None,
                 max_hp=BALANCE.Unit.max_hp,
                 direction=BALANCE.Unit.direction,
                 defence=BALANCE.Unit.defence,
                 weapons=None,
                 **kw):
        """
        @param sublayers_server.model.agents.Agent owner: Object owner
        @param float max_hp: Maximum health level
        @param float direction: Direction angle of unit
        @param list[sublayers_server.model.weapons.weapon] weapons: Set of weapon
        """
        super(Unit, self).__init__(**kw)
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

    @property
    def max_hp(self):
        return self.hp_state.max_hp

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
        if isinstance(target, Unit):
            if target.owner and self.owner:
                if target.owner.party and self.owner.party:
                    if target.owner.party == self.owner.party:
                        return False
        return True

    def takeoff_weapon(self, weapon):
        # todo: продумать меанизм снятия оружия
        pass

    def fire_discharge(self, side):
        FireDischargeEvent(obj=self, side=side).post()

    def fire_auto_enable(self, side, enable, time=None):
        FireAutoEnableEvent(time=time, obj=self, side=side, enable=enable).post()

    def fire_auto_enable_all(self, enable, time=None):
        # log.info('%s  fire_auto_enable_all is %s    in time: %s', self.uid, enable, time)
        self.fire_auto_enable(time=time, side='front', enable=enable)
        self.fire_auto_enable(time=time, side='back', enable=enable)
        self.fire_auto_enable(time=time, side='left', enable=enable)
        self.fire_auto_enable(time=time, side='right', enable=enable)

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

    def on_fire_auto_enable(self, side, enable):
        for sector in self.fire_sectors:
            if sector.side == side:
                sector.enable_auto_fire(enable=enable)

    def on_init(self, event):
        super(Unit, self).on_init(event)
        SearchZones(obj=self).post()

    def on_zone_check(self, event):
        # зонирование
        #log.debug('Zone test     teeeesttt    111111')
        for zone in self.server.zones:
            zone.test_in_zone(obj=self)

    def contact_test(self, obj):
        super(Unit, self).contact_test(obj=obj)
        for sector in self.fire_sectors:
            if sector.is_auto():
                sector.fire_auto(target=obj)

    def send_auto_fire_messages(self, agent, action):
        for shooter in self.hp_state.shooters:
            messages.FireAutoEffect(agent=agent, subj=shooter, obj=self, action=action).post()
        for sector in self.fire_sectors:
            for weapon in sector.weapon_list:
                if isinstance(weapon, WeaponAuto):
                    for target in weapon.targets:
                        messages.FireAutoEffect(agent=agent, subj=self, obj=target,
                                                action=action, side=sector.side).post()

    def on_contact_out(self, obj, **kw):
        for sector in self.fire_sectors:
            sector.out_car(target=obj)
        super(Unit, self).on_contact_out(obj=obj, **kw)

    def on_die(self, event):
        super(Unit, self).on_die(event)
        # перестать стрелять своими автоматическими секторами (!!! не через Ивент !!!)
        self.on_fire_auto_enable(side='front', enable=False)
        self.on_fire_auto_enable(side='back', enable=False)
        self.on_fire_auto_enable(side='left', enable=False)
        self.on_fire_auto_enable(side='right', enable=False)
        # todo: перенести в более правильное место. Временно тут!
        messages.Die(agent=self.owner).post()
        # вроде как нельзя делать в delete, так как при дисконнекте делается ДО удаления
        self.owner.drop_car(self)
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
        )
        return d

    def on_before_delete(self, **kw):
        super(Unit, self).on_before_delete(**kw)
        for task in self.tasks:
            if isinstance(task, HPTask):
                task.done()

    def zone_changed(self, zone_effect, in_zone):
        #log.debug('Zone Changed !!!!!!!!!!!!!!!!!!1111111 1111111111111111111111111111111111111')
        for agent in self.watched_agents:
            messages.ZoneEffectMessage(
                agent=agent,
                subj=self,
                in_zone=in_zone,
                zone_effect=zone_effect.as_dict(),
            ).post()

    def is_auto_fire_enable(self):
        for sector in self.fire_sectors:
            if sector.is_auto_enable():
                return True
        return False


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
        self.state = MotionState(t=time, p=self._position, fi=self._direction)
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
        return self.state.v_forward


class Bot(Mobile):
    pass
