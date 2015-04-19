# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.state import MotionState
from sublayers_server.model.hp_state import HPState
from sublayers_server.model.fuel_state import FuelState
from sublayers_server.model.base import Observer
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.motion_task import MotionTask
from sublayers_server.model.hp_task import HPTask
from sublayers_server.model.fuel_task import FuelTask
from sublayers_server.model.sectors import FireSector
from sublayers_server.model.weapons import WeaponDischarge, WeaponAuto
from sublayers_server.model.events import FireDischargeEvent, FireAutoEnableEvent, FireDischargeEffectEvent, \
    SearchZones, Die
from sublayers_server.model.parameters import Parameter
from sublayers_server.model import messages


class Unit(Observer):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self,
                 time,
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
        super(Unit, self).__init__(time=time, **kw)
        self.owner = owner
        self.main_agent = self._get_main_agent()  # перекрывать в классах-наследниках если нужно
        self.hp_state = HPState(t=time, max_hp=max_hp, hp=max_hp)
        self._direction = direction
        self.altitude = 0.0
        self.zones = []
        self.effects = []
        self.server.effects.get('EffectDirtCC').start(owner=self, time=time)

        self.tasks = []
        """@type: list[sublayers_server.model.tasks.Task]"""
        self.fire_sectors = []
        """@type: list[sublayers_server.model.sectors.FireSector]"""
        if weapons:
            for weapon in weapons:
                self.setup_weapon(dict_weapon=weapon)

    def direction(self, time):
        return self._direction

    def is_died(self, time):
        return self.hp(time=time) <= 0.0

    def hp(self, time):
        return self.hp_state.hp(t=time)

    @property
    def max_hp(self):
        return self.hp_state.max_hp

    def set_hp(self, time, dhp=None, dps=None, add_shooter=None, del_shooter=None, shooter=None):
        HPTask(owner=self, dhp=dhp, dps=dps, add_shooter=add_shooter, del_shooter=del_shooter, shooter=shooter).start(time=time)

    def setup_weapon(self, dict_weapon):
        sector = FireSector(owner=self, radius=dict_weapon['radius'], width=dict_weapon['width'], fi=dict_weapon['fi'])
        if dict_weapon['is_auto']:
            WeaponAuto(owner=self, sectors=[sector], radius=dict_weapon['radius'], width=dict_weapon['width'],
                       dps=dict_weapon['dps'])
        else:
            WeaponDischarge(owner=self, sectors=[sector], radius=dict_weapon['radius'], width=dict_weapon['width'],
                            dmg=dict_weapon['dmg'], time_recharge=dict_weapon['time_recharge'])

    def is_target(self, target):
        return self.main_agent.is_target(target=target)

    def takeoff_weapon(self, weapon):
        # todo: продумать меанизм снятия оружия
        pass

    def fire_discharge(self, side, time):
        FireDischargeEvent(obj=self, side=side, time=time).post()

    def fire_auto_enable(self, side, enable, time):
        FireAutoEnableEvent(time=time, obj=self, side=side, enable=enable).post()

    def fire_auto_enable_all(self, enable, time):
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
            FireDischargeEffectEvent(obj=self, side=side, time=event.time).post()
            # значит выстрел всё-таки был произведён. Отправить на клиенты для отрисовки
            for agent in self.watched_agents:
                messages.FireDischarge(
                    agent=agent,
                    side=side,
                    t_rch=t_rch,
                ).post()

    def on_fire_auto_enable(self, side, enable, time):
        for sector in self.fire_sectors:
            if sector.side == side:
                sector.enable_auto_fire(enable=enable, time=time)

    def on_init(self, event):
        super(Unit, self).on_init(event)
        SearchZones(obj=self, time=event.time).post()

    def on_zone_check(self, event):
        # зонирование
        for zone in self.server.zones:
            zone.test_in_zone(obj=self, time=event.time)

    def contact_test(self, obj, time):
        super(Unit, self).contact_test(obj=obj, time=time)
        for sector in self.fire_sectors:
            if sector.is_auto():
                sector.fire_auto(target=obj, time=time)

    def send_auto_fire_messages(self, agent, action):
        for shooter in self.hp_state.shooters:
            messages.FireAutoEffect(agent=agent, subj=shooter, obj=self, action=action).post()
        for sector in self.fire_sectors:
            for weapon in sector.weapon_list:
                if isinstance(weapon, WeaponAuto):
                    for target in weapon.targets:
                        messages.FireAutoEffect(agent=agent, subj=self, obj=target,
                                                action=action, side=sector.side).post()

    def on_contact_out(self, obj, time, **kw):
        for sector in self.fire_sectors:
            sector.out_car(target=obj, time=time)
        super(Unit, self).on_contact_out(obj=obj, time=time, **kw)

    def on_die(self, event):
        super(Unit, self).on_die(event)
        # Отправка сообщения owner'у о гибели машинки
        if self.owner:
            messages.Die(agent=self.owner).post()
        # todo: удалить себя и на этом месте создать обломки
        self.delete(time=event.time)

    def as_dict(self, time):
        d = super(Unit, self).as_dict(time=time)
        owner = self.owner
        d.update(
            owner=owner and owner.as_dict(time=time),
            direction=self.direction(time=time),
            hp_state=self.hp_state.export(),
            fire_sectors=[sector.as_dict() for sector in self.fire_sectors],
        )
        return d

    def on_before_delete(self, event):
        # перестать стрелять своими автоматическими секторами (!!! не через Ивент !!!)
        self.on_fire_auto_enable(side='front', enable=False, time=event.time)
        self.on_fire_auto_enable(side='back', enable=False, time=event.time)
        self.on_fire_auto_enable(side='left', enable=False, time=event.time)
        self.on_fire_auto_enable(side='right', enable=False, time=event.time)

        # снять все таски стрельбы по нам
        tasks = self.tasks[:]
        for task in tasks:
            if isinstance(task, HPTask):
                task.done()

        # дроп машинки из агента и пати (в которой находится агент)
        if self.owner:
            self.owner.drop_car(car=self, time=event.time)

        super(Unit, self).on_before_delete(event=event)

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

    def _get_main_agent(self):
        return self.owner

    def on_change_altitude(self, new_altitude):
        if new_altitude != self.altitude:
            old_altitude = self.altitude
            self.altitude = new_altitude
            # todo: взять коэффициенты из баланса
            self.p_observing_range.current -= old_altitude * 1.0
            self.p_observing_range.current += new_altitude * 1.0
            if self.owner:
                messages.ChangeAltitude(
                    agent=self.owner,
                    altitude=new_altitude,
                    obj_id=self.id
                ).post()


class Mobile(Unit):
    u"""Class of mobile units"""

    def __init__(self,
                 time,
                 r_min,
                 ac_max,
                 v_forward,
                 v_backward,
                 a_forward,
                 a_backward,
                 a_braking,
                 max_control_speed=BALANCE.Mobile.max_control_speed,
                 max_fuel=BALANCE.Mobile.max_fuel,
                 fuel=BALANCE.Mobile.fuel,
                 **kw):
        super(Mobile, self).__init__(time=time, **kw)
        self.state = MotionState(t=time, **self.init_state_params(
            r_min=r_min,
            ac_max=ac_max,
            v_forward=v_forward,
            v_backward=v_backward,
            a_forward=a_forward,
            a_backward=a_backward,
            a_braking=a_braking,
        ))
        self.fuel_state = FuelState(t=time, max_fuel=max_fuel, fuel=fuel)
        self.cur_motion_task = None
        # Parametrs
        Parameter(original=1.0, min_value=0.0, max_value=1.0, owner=self, name='p_cc')  # todo: вычислить так: max_control_speed / v_max
        Parameter(original=0.5, owner=self, name='p_fuel_rate')

    def init_state_params(self, r_min, ac_max, v_forward, v_backward, a_forward, a_backward, a_braking):
        return dict(
            p=self._position,
            fi=self._direction,
            r_min=r_min,
            ac_max=ac_max,
            v_forward=v_forward,
            v_backward=v_backward,
            a_forward=a_forward,
            a_backward=a_backward,
            a_braking=a_braking,
        )

    def as_dict(self, time):
        d = super(Mobile, self).as_dict(time=time)
        d.update(
            state=self.state.export(),
            fuel_state=self.fuel_state.export(),
            v_forward=self.state.v_forward,
            v_backward=self.state.v_backward,
        )
        return d

    def on_init(self, event):
        self.contacts_check_interval = 2.0  # todo: optimize. Regular in motion only
        super(Mobile, self).on_init(event)

    def on_start(self, event):
        self.set_fuel(time=event.time)

    def on_stop(self, event):
        self.set_fuel(time=event.time)

    def set_motion(self, time, target_point=None, cc=None, turn=None, comment=None):
        assert (turn is None) or (target_point is None)
        MotionTask(owner=self, target_point=target_point, cc=cc, turn=turn, comment=comment).start(time=time)

    def set_fuel(self, time, df=None):
        FuelTask(owner=self, df=df).start(time=time)

    def on_before_delete(self, event):
        tasks = self.tasks[:]
        for task in tasks:
            if isinstance(task, MotionTask) or isinstance(task, FuelTask):
                task.done()
        super(Mobile, self).on_before_delete(event=event)

    def on_fuel_empty(self, event):
        pass
        '''
        self.p_cc.current = 0.0
        self.set_motion()
        Die(time=event.time + 20.0, obj=self).post()
        '''

    def v(self, time):
        return self.state.v(t=time)

    def position(self, time):
        return self.state.p(t=time)

    def direction(self, time):
        return self.state.fi(t=time)


class Bot(Mobile):
    @property
    def is_frag(self):
        return True


class ExtraMobile(Mobile):
    def __init__(self, starter, **kw):
        self.starter = starter
        super(ExtraMobile, self).__init__(**kw)

    @property
    def is_frag(self):
        return False

    @property
    def main_unit(self):
        return self.starter.main_unit

    def _get_main_agent(self):
        return self.starter.main_agent

    def as_dict(self, time):
        d = super(ExtraMobile, self).as_dict(time=time)
        login = None if self.main_unit is None else self.main_agent.login
        d.update(
            main_agent_login=login,
        )
        return d


class Slave(ExtraMobile):
    def on_init(self, event):
        super(Slave, self).on_init(event)
        if self.main_agent:
            self.main_agent.append_obj(obj=self, time=event.time)

    def on_before_delete(self, event):
        if self.main_agent:
            self.main_agent.drop_obj(obj=self, time=event.time)
        super(Slave, self).on_before_delete(event=event)


class UnitWeapon(ExtraMobile):
    pass