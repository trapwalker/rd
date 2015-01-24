# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from state import State
from hp_state import HPState
from base import Observer
from balance import BALANCE
from math import pi
from motion_task import MotionTask
from sectors import FireSector
from weapons import WeaponDischarge, WeaponAuto
from events import FireDischargeEvent, FireAutoEnableEvent


class Unit(Observer):
    u"""Abstract class for any controlled GEO-entities"""

    def __init__(self, owner=None, max_hp=None, direction=-pi/2, defence=BALANCE.Unit.defence, weapons=None,
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
        t = self.server.get_time()
        self.hp_state = HPState(t=t, max_hp=max_hp, hp=max_hp, dps=0.0)
        self._direction = direction
        self.fire_sectors = []
        """@type: list[sublayers_server.model.sectors.FireSector]"""
        self.tasks = []
        """@type: list[sublayers_server.model.tasks.Task]"""

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
    def is_died(self, t=None):
        t = t if t is not None else self.server.get_time()
        return self.hp_state.hp(t) <= 0.0

    @property
    def hp(self):
        return self.hp_state.hp(self.server.get_time())

    def hp_by_time(self, t=None):
        t = t if t is not None else self.server.get_time()
        return self.hp_state.hp(t)

    def setup_weapon(self, item_weapon, fi):
        sector = FireSector(owner=self, radius=item_weapon.radius, width=item_weapon.width, fi=fi)
        if item_weapon.is_auto:
            WeaponAuto(owner=self, sectors=[sector], radius=item_weapon.radius, width=item_weapon.width,
                       dps=item_weapon.dps)
        else:
            WeaponDischarge(owner=self, sectors=[sector], radius=item_weapon.radius, width=item_weapon.width,
                            dmg=item_weapon.dmg, time_recharge=item_weapon.time_recharge)

    def takeoff_weapon(self, weapon):
        # todo: продумать меанизм снятия оружия
        pass

    def fire_discharge(self, side):
        FireDischargeEvent(obj=self, side=side).post()

    def fire_auto_enable(self, side):
        FireAutoEnableEvent(obj=self, side=side, enable=True)

    def fire_auto_disale(self, side):
        FireAutoEnableEvent(obj=self, side=side, enable=False)

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
        # todo: отправить на клиент маскимальную перезарядку данного борта (нельзя всем отправлять свою перезарядку! НЕЛЬЗЯ) !!!!
        # todo:  нужно отправить всем сообщение о выстреле

    def on_fire_auto_enable(self, event):
        side = event.side
        enable = event.enable
        for sector in self.fire_sectors:
            if sector.side == side:
                sector.enable_auto_fire(enable=enable)

    def on_start_auto_fire(self, weapon):
        # начало авто стрельбы. нужно отправить (всем или только себе) сообщение о выстреле
        pass

    def on_end_auto_fire(self, weapon):
        # конец авто стрельбы. нужно отправить (всем или только себе) сообщение о выстреле
        pass

    def contact_test(self, obj):
        super(Unit, self).contact_test(obj=obj)
        for sector in self.fire_sectors:
            if sector.is_auto:
                sector.fire_auto(target=obj)

    def on_contact_out(self, time, obj, **kw):
        super(Unit, self).on_contact_out(time=time, obj=obj, **kw)
        for sector in self.fire_sectors:
            sector.out_car(target=obj)

    def on_die(self):
        # todo: удалить себя и на этом месте создать обломки
        pass

    def as_dict(self, to_time=None):
        d = super(Unit, self).as_dict(to_time=to_time)
        owner = self.owner
        d.update(
            owner=owner and owner.as_dict(),
            direction=self.direction,
            hp=self.hp_by_time(t=to_time),
            max_hp=self.hp_state.max_hp,
            #weapons=[weapon.as_dict(to_time=to_time) for weapon in self.weapons],
            role=None if self.role is None else self.role.name,
        )
        return d

    def on_before_delete(self, **kw):
        if self.role:
            self.role.remove_car(self)
            # todo: rename
        super(Unit, self).on_before_delete(**kw)


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
