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
from sublayers_server.model.events import (
    Event, FireDischargeEvent, FireAutoEnableEvent, SearchZones, FireAutoTestEvent, event_deco,
)
from sublayers_server.model.parameters import Parameter
from sublayers_server.model import messages
from sublayers_server.model.poi_loot_objects import CreatePOILootEvent, POILoot, POICorpse
from sublayers_server.model.vectors import Point
from sublayers_server.model.quick_consumer_panel import QuickConsumerPanel
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
        self.owner = owner
        self.owner_example = None if self.owner is None else self.owner.example
        super(Unit, self).__init__(time=time, **kw)
        self.main_agent = self._get_main_agent()  # перекрывать в классах-наследниках если нужно

        # Установка параметров
        Parameter(original=self._param_aggregate['p_armor'],
                  name='p_armor',
                  owner=self, min_value=0.0, max_value=100.)
        Parameter(original=self._param_aggregate['p_radiation_armor'],
                  name='p_radiation_armor',
                  owner=self, min_value=0.0, max_value=100.)

        self.hp_state = HPState(
            owner=self,
            t=time,
            hp=self.example.hp,
            max_hp=self._param_aggregate['max_hp'],
        )
        self._direction = direction or self.example.direction
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

        # загрузка инвенторя
        self.inventory = self.example.inventory.create_model(server=self.server, time=time, owner=self)
        if owner:
            self.inventory.add_manager(agent=owner)

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

    @property
    def max_hp(self):
        return self.hp_state.max_hp

    def restart_weapons(self, time):
        self.hp_state.restart_weapons(time)

    def set_hp(self, time, dhp=None, dps=None, add_shooter=None, del_shooter=None, shooter=None, add_weapon=None,
               del_weapon=None):
        HPTask(
            owner=self,
            dhp=dhp,
            dps=dps,
            add_shooter=add_shooter,
            del_shooter=del_shooter,
            shooter=shooter,
            add_weapon=add_weapon,
            del_weapon=del_weapon,
        ).start(time=time)

    def setup_weapons(self, time):
        def direction_by_symbol(symbol):
            if symbol == 'F':
                return 0.0
            if symbol == 'B':
                return radians(180.0)
            if symbol == 'L':
                return radians(-90.0)
            if symbol == 'R':
                return radians(90.0)
            return 0.0

        example_agent = None if self.owner is None else self.owner.example
        dps_rate = self._param_aggregate['dps_rate']
        damage_rate = self._param_aggregate['damage_rate']
        time_recharge_rate = self._param_aggregate['time_recharge_rate']
        radius_rate = self._param_aggregate['radius_rate']

        for w_ex in self.example.iter_weapons():
            sector = FireSector(
                owner=self,
                radius=w_ex.radius * radius_rate,
                width=radians(w_ex.width),
                fi=direction_by_symbol(w_ex.direction),
            )
            if w_ex.is_auto:
                WeaponAuto(
                    owner=self,
                    sector=sector,
                    dps=w_ex.dps * dps_rate,
                    items_cls_list=[w_ex.ammo],
                    dv=w_ex.ammo_per_shot,
                    ddvs=w_ex.ammo_per_second,
                    example=w_ex,
                )
            else:
                WeaponDischarge(
                    owner=self,
                    sector=sector,
                    dmg=w_ex.dmg * damage_rate,
                    area_dmg=w_ex.area_dmg * damage_rate,
                    items_cls_list=[w_ex.ammo],
                    dv=w_ex.ammo_per_shot,
                    ddvs=w_ex.ammo_per_second,
                    time_recharge=w_ex.time_recharge * time_recharge_rate,
                    example=w_ex,
                )

    def is_target(self, target):
        return self.main_agent.is_target(target=target)

    def takeoff_weapon(self, weapon):
        # todo: продумать меанизм снятия оружия
        pass

    def fire_discharge(self, side, time):
        if self.limbo or not self.is_alive:
            log.debug('Error! {} try fire_discharge in limbo'.format(self))
            return
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

    def on_fire_auto_enable(self, enable, time, event=None):
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
        # зарядить все орудия
        for weapon in self.weapon_list():
            item = self.inventory.get_item_by_cls(balance_cls_list=[weapon.example.ammo], time=event.time)
            if item:
                weapon.set_item(item=item, time=event.time)
        # включить пассивный отхил  # todo: убедиться, что отрицательное значение здесь - правильное решение
        self.set_hp(time=event.time, dps=-self._param_aggregate['repair_rate'])

    def on_zone_check(self, event):
        # зонирование
        for zone in self.server.zones:
            zone.test_in_zone(obj=self, time=event.time)

    def on_auto_fire_test(self, target_list, time):
        # log.debug('on_auto_fire_test bot = %s', self.uid)
        for sector in self.fire_sectors:
            if sector.is_auto():
                sector.fire_auto(target_list=target_list, time=time)

    def send_auto_fire_messages(self, agent, action, time):
        for shooter in self.hp_state.shooters:
            messages.FireAutoEffect(agent=agent, subj=shooter, obj=self, action=action, time=time).post()
        for sector in self.fire_sectors:
            for weapon in sector.weapon_list:
                if isinstance(weapon, WeaponAuto):
                    for target in weapon.targets:
                        messages.FireAutoEffect(
                            agent=agent, subj=self, obj=target, action=action, sector=sector, time=time,
                        ).post()

    def on_die(self, event):
        super(Unit, self).on_die(event)
        # Отправка сообщения owner'у о гибели машинки
        if self.owner:
            self.owner.on_die(event=event, unit=self)
        # todo: удалить себя и на этом месте создать обломки
        self.delete(time=event.time)

        # вернуть агенту стоимость машинки
        if self.owner:
            self.owner.example.set_balance(time=event.time, delta=self.example.price)
            # todo: возможно это нужно перенести (!)
            self.owner.example.car = None

        # todo: Сделать другой эвенет, передавать в него не список итемов, а inventory
        if not self.inventory.is_empty():
            CreatePOILootEvent(
                server=self.server,
                time=event.time,
                poi_cls=POICorpse,
                example=None,
                inventory_size=self.example.inventory.size,
                position=self.position(event.time),
                life_time=self.server.poi_loot_objects_life_time,
                items=self.inventory.get_items(),
                sub_class_car=self.example.sub_class_car,
                car_direction=self.direction(event.time),
            ).post()

    def drop_item_to_map(self, item, time):
        CreatePOILootEvent(
            server=self.server,
            time=time,
            poi_cls=POILoot,
            example=None,
            inventory_size=1,
            position=Point.random_gauss(self.position(time), 10),
            life_time=self.server.poi_loot_objects_life_time,
            items=[item],
        ).post()

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
        self.on_fire_auto_enable(enable=False, time=event.time, event=event)

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

    # def zone_changed(self, zone_effect, in_zone):
    #     #log.debug('Zone Changed !!!!!!!!!!!!!!!!!!1111111 1111111111111111111111111111111111111')
    #     for agent in self.watched_agents:
    #         messages.ZoneEffectMessage(
    #             agent=agent,
    #             subj=self,
    #             in_zone=in_zone,
    #             zone_effect=zone_effect.as_dict(),
    #         ).post()

    def is_auto_fire_enable(self):
        for sector in self.fire_sectors:
            if sector.is_auto_enable():
                return True
        return False

    def _get_main_agent(self):
        return self.owner

    def on_change_altitude(self, new_altitude, time):
        # log.debug('on_change_altitude = %s', new_altitude)
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
                self.upd_observing_range(time)

    def on_save(self, time):
        self.example.hp = self.hp(time=time)
        self.example.direction = self.direction(time=time)
        self.inventory.save_to_example(time=time)
        super(Unit, self).on_save(time=time)

    def weapon_list(self):
        for sector in self.fire_sectors:
            for w in sector.weapon_list:
                yield w

    def on_kill(self, event, obj):
        # Начисление опыта и фрага машинке
        self.example.set_frag(dvalue=1)  # начисляем фраг машинке
        d_car_exp = self.example.exp_table.car_exp_price_by_exp(exp=obj.example.exp)
        self.example.set_exp(dvalue=d_car_exp, time=event.time) # начисляем опыт машинке


class Mobile(Unit):
    u"""Class of mobile units"""

    def __init__(self, time, **kw):
        super(Mobile, self).__init__(time=time, **kw)
        self.state = MotionState(t=time, **self.init_state_params())
        self.fuel_state = FuelState(t=time, fuel=self.example.fuel, max_fuel=self._param_aggregate['max_fuel'])
        self.cur_motion_task = None

        v_forward = self._param_aggregate['v_forward']
        self.max_control_speed = self._param_aggregate['max_control_speed']
        assert v_forward <= self.max_control_speed
        Parameter(original=v_forward / self.max_control_speed, min_value=0.05, max_value=1.0, owner=self, name='p_cc')

        Parameter(
            original=self._param_aggregate['p_fuel_rate'],
            owner=self, name='p_fuel_rate',
        )
        Parameter(
            original=self._param_aggregate['p_obs_range_rate_max'],
            owner=self, name='p_obs_range_rate_max',
        )
        Parameter(
            original=self._param_aggregate['p_obs_range_rate_min'],
            owner=self, name='p_obs_range_rate_min',
        )

    def get_visibility(self, time):
        cur_v = abs(self.v(time=time))
        visibility_min = self.params.get('p_visibility_min').value
        visibility_max = self.params.get('p_visibility_max').value
        value = visibility_min + ((visibility_max - visibility_min) * (cur_v / self.max_control_speed))
        if not (0 <= value <= 1):
            log.debug('Error!!! get_visibility !!!')
            log.debug('value={} vis_min={} vis_max={}, cur_v={}, mcs={}, time={} unit={}'.format(value, visibility_min,
                                                                                visibility_max, cur_v,
                                                                                self.max_control_speed, time, self))
            self.server.stop()
        return value

    def get_observing_range(self, time):
        cur_v = abs(self.v(time=time))
        p_obs_range_rate_min = self.params.get('p_obs_range_rate_min').value
        p_obs_range_rate_max = self.params.get('p_obs_range_rate_max').value
        value = p_obs_range_rate_min + (
            (p_obs_range_rate_max - p_obs_range_rate_min) * (1 - cur_v / self.max_control_speed)
        )
        assert 0 <= value <= 1, 'value={} p_obs_r_min={} p_obs_r_max={} cur_v={} max_c_s={}'.format(value, p_obs_range_rate_min, p_obs_range_rate_max, cur_v, self.max_control_speed)
        return self.params.get('p_observing_range').value * value

    def init_state_params(self):
        return dict(
            p=self._position,
            fi=self._direction,
            r_min=self._param_aggregate['r_min'],
            ac_max=self._param_aggregate['ac_max'],
            v_forward=self._param_aggregate['max_control_speed'],
            v_backward=self._param_aggregate['v_backward'],
            a_forward=self._param_aggregate['a_forward'],
            a_backward=self._param_aggregate['a_backward'],
            a_braking=self._param_aggregate['a_braking'],
        )

    def as_dict(self, time):
        d = super(Mobile, self).as_dict(time=time)
        d.update(
            state=self.state.export(),
            fuel_state=self.fuel_state.export(),
            v_forward=self.state.v_forward,
            v_backward=self.state.v_backward,
            p_cc=self.params.get('p_cc').value,
            p_obs_range_rate_max=self.params.get('p_obs_range_rate_max').value,
            p_obs_range_rate_min=self.params.get('p_obs_range_rate_min').value,
        )
        return d

    def on_start(self, event):
        self.set_fuel(time=event.time)

    def on_stop(self, event):
        self.set_fuel(time=event.time)

    def set_motion(self, time, target_point=None, cc=None, turn=None, comment=None):
        if self.limbo or not self.is_alive:
            log.warning('{} try set_motion in limbo main_agent={}'.format(self, self.main_agent))
        assert (turn is None) or (target_point is None)
        MotionTask(owner=self, target_point=target_point, cc=cc, turn=turn, comment=comment).start(time=time)

    def set_fuel(self, time, df=None):
        if df:  # значит хотим залить (пока нет дамага, снимающего литры)
            # todo: fix it for df < 0 #fixit
            ef = self.server.reg['effects/fuel/empty']
            if ef:
                ef.done(owner=self, time=time)  # снять эффект

        FuelTask(owner=self, df=df).start(time=time)

    def on_before_delete(self, event):
        tasks = self.tasks[:]
        for task in tasks:
            if isinstance(task, MotionTask) or isinstance(task, FuelTask):
                task.done()
        super(Mobile, self).on_before_delete(event=event)

    def on_fuel_empty(self, event):
        ef = self.server.reg['effects/fuel/empty']
        if ef:
            ef.start(owner=self, time=event.time)

    def v(self, time):
        return self.state.v(t=time)

    def a(self):
        return self.state.a

    def position(self, time):
        return self.state.p(t=time)

    def direction(self, time):
        return self.state.fi(t=time)

    def fuel(self, time):
        return self.fuel_state.fuel(t=time)

    def on_save(self, time):
        super(Mobile, self).on_save(time=time)
        self.example.fuel = self.fuel(time=time)

    def upd_observing_range(self, time):  # todo: возможно это неверно работает! найти высоту или лес и проверить в пати
        super(Mobile, self).upd_observing_range(time)
        for agent in self.watched_agents:
            messages.UpdateObservingRange(agent=agent, obj=self, time=time).post()


class Bot(Mobile):
    def __init__(self, time, **kw):
        super(Bot, self).__init__(time=time, **kw)
        self.quick_consumer_panel = QuickConsumerPanel(owner=self, time=time)
        self.start_shield_event = None

        # self.current_item_action ивент для активации итемов, единовременно игрок (а точнее его машинка) может
        # активировать только один итем (активация может потребовать некоторое время). Любое действие в этот момент
        # приведет к отмене текущей активации, итем при этом не должен быть потерян.
        self.current_item_action = None

    def as_dict(self, time):
        d = super(Bot, self).as_dict(time=time)
        d.update(quick_consumer_panel=self.quick_consumer_panel.as_dict(time=time))
        if self.example:
            d.update(class_car=self.example.class_car, sub_class_car=self.example.sub_class_car)
        return d

    def on_save(self, time):
        super(Bot, self).on_save(time=time)
        self.quick_consumer_panel.save()

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

    def on_kill(self, event, obj):
        # Начисление опыта и фрага агенту
        self.main_agent.on_kill(event=event, target=obj, killer=self)
        super(Bot, self).on_kill(event=event, obj=obj)

    def start_shield_off(self, event):
        self.start_shield_event = None
        self.params.get('p_radiation_armor').current -= 100
        self.params.get('p_armor').current -= 100
        self.restart_weapons(time=event.time)

    def on_init(self, event):
        super(Bot, self).on_init(event=event)
        # если при инициализации машина не движется, то включить возможный пассивнх хил
        if not self.state.is_moving:
            self.set_hp(time=event.time, dps=-self._param_aggregate['repair_rate_on_stay'])

        # Включение стартовой неуязвимости:
        if self.example.start_shield_time > 0:
            self.params.get('p_radiation_armor').current += 100
            self.params.get('p_armor').current += 100
            self.restart_weapons(time=event.time)
            # todo: use event_deco
            self.start_shield_event = Event(server=self.server, time=event.time + self.example.start_shield_time,
                                            callback_after=self.start_shield_off)
            self.start_shield_event.post()

    def on_fire_discharge(self, event):
        super(Bot, self).on_fire_discharge(event=event)

        # Снимаем щиты
        if self.start_shield_event:
            self.start_shield_event.cancel()
            self.start_shield_off(event=event)

        # Отключаем активацию итема
        if self.current_item_action:
            self.current_item_action.cancel(time=event.time)

    def on_fire_auto_enable(self, event=None, **kw):
        super(Bot, self).on_fire_auto_enable(event=event, **kw)
        if self.start_shield_event:
            self.start_shield_event.cancel()
            self.start_shield_off(event=event)

    def on_start(self, event):
        super(Bot, self).on_start(event=event)

        # Пассивный хил при остановке (от перков скилы и т.д.)
        self.set_hp(time=event.time, dps=self._param_aggregate['repair_rate_on_stay'])

        # Снимаем щиты
        if self.start_shield_event:
            self.start_shield_event.cancel()
            self.start_shield_off(event=event)

        # Отключаем активацию итема
        if self.current_item_action:
            self.current_item_action.cancel(time=event.time)

    def on_stop(self, event):
        super(Bot, self).on_stop(event=event)
        # todo: убедиться, что отрицательное значение получается путём подставления минуса - хорошо
        self.set_hp(time=event.time, dps=-self._param_aggregate['repair_rate_on_stay'])


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
        login = None if self.main_unit is None else self.main_agent.user.name
        d.update(
            main_agent_login=login,
        )
        return d

    def on_kill(self, event, obj):
        # Начисление опыта и фрага агенту
        self.main_agent.on_kill(event=event, target=obj, killer=self)


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
