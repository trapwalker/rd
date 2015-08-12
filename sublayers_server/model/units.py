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
    SearchZones, Die, FireAutoTestEvent
from sublayers_server.model.parameters import Parameter
from sublayers_server.model import messages
from sublayers_server.model.inventory import Inventory, ItemState

from math import radians


class Unit(Observer):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self, time, direction=None, owner=None, **kw):
        """
        @param sublayers_server.model.agents.Agent owner: Object owner
        @param float max_hp: Maximum health level
        @param float direction: Direction angle of unit
        @param list[sublayers_server.model.weapons.weapon] weapons: Set of weapon
        """
        super(Unit, self).__init__(time=time, **kw)
        self.owner = owner
        self.main_agent = self._get_main_agent()  # перекрывать в классах-наследниках если нужно
        self.hp_state = HPState(t=time, max_hp=self.example.max_hp, hp=self.example.hp)
        self._direction = self.example.direction or direction
        self.altitude = 0.0
        self.check_zone_interval = None
        self.zones = []
        self.effects = []
        self.tasks = []
        """@type: list[sublayers_server.model.tasks.Task]"""
        self.turn_on_auto_fire = False
        self.check_auto_fire_interval = None
        self.fire_sectors = []
        """@type: list[sublayers_server.model.sectors.FireSector]"""

        # костыль для инвенторя
        self.inventory = Inventory(max_size=10, owner=self, time=time)
        self.set_def_items(time=time)

        self.setup_weapons(time=time)

        # обновляем статистику сервера
        server_stat = self.server.stat_log
        server_stat.s_units_all(time=time, delta=1.0)
        server_stat.s_units_on(time=time, delta=1.0)

    def direction(self, time):
        return self._direction

    def is_died(self, time):
        return self.hp(time=time) <= 0.0

    def hp(self, time):
        return self.hp_state.hp(t=time)

    def set_def_items(self, time):
        # ammo1_cls = self.server.reg['/items/usable/ammo/bullets/a127x99']
        # ammo2_cls = self.server.reg['/items/usable/ammo/bullets/a762']
        # f_tank10_cls = self.server.reg['/items/usable/fuel/tanks/tank_full/tank10']
        # f_tank20_cls = self.server.reg['/items/usable/fuel/tanks/tank_full/tank20']
        # e_tank10_cls = self.server.reg['/items/usable/fuel/tanks/tank_empty/tank10']
        # e_tank20_cls = self.server.reg['/items/usable/fuel/tanks/tank_empty/tank20']

        for item_example in self.example.inventory:
            ItemState(server=self.server, time=time, example=item_example).set_inventory(
                time=time,
                inventory=self.inventory)

                    # self.ammo1 = ItemState(server=self.server, time=time, example=ammo1_cls, count=10)
        # self.ammo1.set_inventory(time=time, inventory=self.inventory)
        # self.ammo2 = ItemState(server=self.server, time=time, example=ammo2_cls, count=10)
        # self.ammo2.set_inventory(time=time, inventory=self.inventory)
        #
        # ItemState(server=self.server, time=time, example=f_tank10_cls).set_inventory(time=time,
        #                                                                              inventory=self.inventory)
        # ItemState(server=self.server, time=time, example=f_tank20_cls).set_inventory(time=time,
        #                                                                              inventory=self.inventory)
        # ItemState(server=self.server, time=time, example=e_tank10_cls).set_inventory(time=time,
        #                                                                              inventory=self.inventory)
        # ItemState(server=self.server, time=time, example=e_tank20_cls).set_inventory(time=time,
        #                                                                              inventory=self.inventory)
        #
        # ItemState(server=self.server, time=time, balance_cls='Tank20', max_count=1).set_inventory(time=time,
        #                                                                                           inventory=self.inventory)
        # self.item_ammo2 = ItemState(server=self.server, time=time, balance_cls='Ammo2', count=20)
        # self.item_ammo2.set_inventory(time=time, inventory=self.inventory)

    @property
    def max_hp(self):
        return self.hp_state.max_hp

    def set_hp(self, time, dhp=None, dps=None, add_shooter=None, del_shooter=None, shooter=None):
        HPTask(owner=self, dhp=dhp, dps=dps, add_shooter=add_shooter, del_shooter=del_shooter, shooter=shooter)\
            .start(time=time)

    def setup_weapons(self, time):
        for w_ex in self.example.iter_weapons():
            sector = FireSector(owner=self, radius=w_ex.radius, width=radians(w_ex.width), fi=radians(w_ex.direction))
            if w_ex.is_auto:
                weapon = WeaponAuto(owner=self, sector=sector, dps=w_ex.dps, items_cls_list=[w_ex.ammo],
                                    dv=w_ex.ammo_per_shot, ddvs=w_ex.ammo_per_second)
                # weapon.set_item(item=self.ammo2, time=time)
            else:
                weapon = WeaponDischarge(owner=self, sector=sector, dmg=w_ex.dmg, items_cls_list=[w_ex.ammo],
                                         dv=w_ex.ammo_per_shot, ddvs=w_ex.ammo_per_second, time_recharge=w_ex.time_recharge)
                # weapon.set_item(item=self.ammo1, time=time)

    def is_target(self, target):
        return self.main_agent.is_target(target=target)

    def takeoff_weapon(self, weapon):
        # todo: продумать меанизм снятия оружия
        pass

    def fire_discharge(self, side, time):
        FireDischargeEvent(obj=self, side=side, time=time).post()

    def fire_auto_enable(self, enable, time):
        FireAutoEnableEvent(time=time, obj=self, enable=enable).post()

    def on_fire_discharge(self, event):
        time = event.time
        side = event.side

        # сначала проверяем можем ли мы стрельнуть бортом
        for sector in self.fire_sectors:
            if sector.side == side:
                if not sector.can_discharge_fire(time=time):
                    return

        for sector in self.fire_sectors:
            if sector.side == side:
                sector.fire_discharge(time=time)

    def on_fire_auto_enable(self, enable, time):
        # log.debug('on_fire_auto_enable      %s  bot = %s', enable, self.uid)
        if self.turn_on_auto_fire == enable:
            return
        else:
            self.turn_on_auto_fire = enable
            if enable:
                FireAutoTestEvent(obj=self, time=time).post()
            else:
                for event in self.events:
                    if isinstance(event, FireAutoTestEvent):
                        event.cancel()
            for sector in self.fire_sectors:
                sector.enable_auto_fire(enable=enable, time=time)

    def on_init(self, event):
        super(Unit, self).on_init(event)
        self.check_auto_fire_interval = BALANCE.interval_refresh
        self.check_zone_interval = BALANCE.interval_refresh
        SearchZones(obj=self, time=event.time).post()

    def on_zone_check(self, event):
        # зонирование
        for zone in self.server.zones:
            zone.test_in_zone(obj=self, time=event.time)

    def on_auto_fire_test(self, obj, time):
        #log.debug('on_auto_fire_test bot = %s', self.uid)
        for sector in self.fire_sectors:
            if sector.is_auto():
                sector.fire_auto(target=obj, time=time)

    def send_auto_fire_messages(self, agent, action, time):
        for shooter in self.hp_state.shooters:
            messages.FireAutoEffect(agent=agent, subj=shooter, obj=self, action=action, time=time).post()
        for sector in self.fire_sectors:
            for weapon in sector.weapon_list:
                if isinstance(weapon, WeaponAuto):
                    for target in weapon.targets:
                        messages.FireAutoEffect(agent=agent, subj=self, obj=target,
                                                action=action, side=sector.side, time=time).post()

    def on_contact_out(self, obj, time, **kw):
        for sector in self.fire_sectors:
            sector.out_car(target=obj, time=time)
        super(Unit, self).on_contact_out(obj=obj, time=time, **kw)

    def on_die(self, event):
        super(Unit, self).on_die(event)
        # Отправка сообщения owner'у о гибели машинки
        if self.owner:
            messages.Die(agent=self.owner, time=event.time).post()
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
        self.on_fire_auto_enable(enable=False, time=event.time)

        # снять все таски стрельбы по нам
        tasks = self.tasks[:]
        for task in tasks:
            if isinstance(task, HPTask):
                task.done()

        # дроп машинки из агента и пати (в которой находится агент)
        if self.owner:
            self.owner.drop_car(car=self, time=event.time, drop_owner=False)

        # обновляем статистику по живым юнитам
        self.server.stat_log.s_units_on(time=event.time, delta=-1.0)

        # очистка всех визиторов из инвентаря машинки
        self.inventory.del_all_visitors(time=event.time)

        super(Unit, self).on_before_delete(event=event)

        # необходимо ради правильных out этой машинки.
        self.owner = None

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

    def on_change_altitude(self, new_altitude, time):
        pass
        #if isinstance(self, Bot):
        #     log.debug('on_alt_change: %s, %s', new_altitude, self.altitude)
        if new_altitude != self.altitude:
            old_altitude = self.altitude
            self.altitude = new_altitude
            # todo: взять коэффициенты из баланса
            self.params.get('p_observing_range').current -= old_altitude * 1.0
            self.params.get('p_observing_range').current += new_altitude * 1.0
            if self.owner:
                messages.ChangeAltitude(
                    agent=self.owner,
                    altitude=new_altitude,
                    obj_id=self.id,
                    time=time
                ).post()

    def save(self, time):
        super(Unit, self).save(time=time)
        self.example.hp = self.hp(time=time)
        self.example.direction = self.direction(time=time)


class Mobile(Unit):
    u"""Class of mobile units"""

    def __init__(self, time, **kw):
        super(Mobile, self).__init__(time=time, **kw)
        self.state = MotionState(t=time, **self.init_state_params())
        self.fuel_state = FuelState(t=time, max_fuel=self.example.max_fuel, fuel=self.example.fuel)
        self.cur_motion_task = None

        assert self.example.max_control_speed <= self.example.v_forward
        Parameter(original=self.example.max_control_speed / self.example.v_forward,
                  min_value=0.0, max_value=1.0, owner=self, name='p_cc')
        Parameter(original=self.example.p_fuel_rate, owner=self, name='p_fuel_rate')

    def init_state_params(self):
        return dict(
            p=self._position,
            fi=self._direction,
            r_min=self.example.r_min,
            ac_max=self.example.ac_max,
            v_forward=self.example.v_forward,
            v_backward=self.example.v_backward,
            a_forward=self.example.a_forward,
            a_backward=self.example.a_backward,
            a_braking=self.example.a_braking,
        )

    def as_dict(self, time):
        d = super(Mobile, self).as_dict(time=time)
        d.update(
            state=self.state.export(),
            fuel_state=self.fuel_state.export(),
            v_forward=self.state.v_forward,
            v_backward=self.state.v_backward,
            p_cc=self.params.get('p_cc').value,
        )
        return d

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

    def fuel(self, time):
        return self.fuel_state.fuel(t=time)

    def save(self, time):
        super(Mobile, self).save(time=time)
        self.example.fuel = self.fuel(time=time)


class Bot(Mobile):
    @property
    def is_frag(self):
        return True

    def add_to_chat(self, chat, time):
        super(Bot, self).add_to_chat(chat=chat, time=time)
        if self.owner:
            chat.room.include(agent=self.owner, time=time)

    def del_from_chat(self, chat, time):
        super(Bot, self).del_from_chat(chat=chat, time=time)
        if self.owner:
            chat.room.exclude(agent=self.owner, time=time)


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