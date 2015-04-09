# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import UnitWeapon
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.hp_task import HPTask
from sublayers_server.model.motion_task import MotionTask
from sublayers_server.model import messages
from sublayers_server.model.events  import Event, BangEvent
import sublayers_server.model.tags as tags


class RocketStartEvent(Event):
    def __init__(self, starter, **kw):
        super(RocketStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter

    def on_perform(self):
        super(RocketStartEvent, self).on_perform()
        Rocket(starter=self.starter)


class Rocket(UnitWeapon):
    def __init__(
        self, starter,
        observing_range=BALANCE.Rocket.observing_range,
        max_hp=BALANCE.Rocket.max_hp,
        a_forward=BALANCE.Rocket.a_forward,
        a_braking=BALANCE.Rocket.a_braking,
        v_forward=BALANCE.Rocket.v_forward,
        ac_max=BALANCE.Rocket.ac_max,
        max_control_speed=BALANCE.Rocket.max_control_speed,
        damage=BALANCE.Rocket.damage,
        radius_damage=BALANCE.Rocket.radius_damage,
        **kw
    ):
        # todo: docstring required
        # взять позицию и направление выпустившего ракету
        self.starter = starter
        self.radius_damage = radius_damage
        self.damage = damage
        super(Rocket, self).__init__(position=starter.position,
                                     direction=starter.direction,
                                     r_min=10,
                                     observing_range=observing_range,
                                     max_hp=max_hp,
                                     a_forward=a_forward,
                                     a_braking=a_braking,
                                     a_backward=0.0,
                                     v_forward=v_forward,
                                     v_backward=0.0,
                                     ac_max=ac_max,
                                     max_control_speed=max_control_speed,
                                     server=starter.server,
                                     **kw)

    def on_init(self, event):
        super(Rocket, self).on_init(event)
        MotionTask(owner=self, cc=1.0).start()
        # HPTask(owner=self, dps=1.0).start()
        self.delete(time=event.time + 10.0)

    def on_before_delete(self, event):
        BangEvent(starter=self.main_unit, center=self.position, radius=self.radius_damage,
                  damage=self.damage).post()
        super(Rocket, self).on_before_delete(event=event)

    def on_contact_in(self, time, obj, **kw):
        super(Rocket, self).on_contact_in(time=time, obj=obj, **kw)
        if not self.is_target(target=obj):  # нельзя взрываться о тех, кто не является целью для main_unit'а
            return
        if tags.RocketTag in obj.tags:  # чтобы ракеты не врезались друг в друга
            return

        self.delete()

    @property
    def is_frag(self):
        return False

    def set_default_tags(self):
        self.tags.add(tags.RocketTag)
        self.tags.add(tags.UnZoneTag)

    @property
    def main_unit(self):
        return self.starter.main_unit


u'''
    SlowMine
'''


class SlowMineStartEvent(Event):
    def __init__(self, starter, **kw):
        super(SlowMineStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter

    def on_perform(self):
        super(SlowMineStartEvent, self).on_perform()
        Rocket(starter=self.starter)


class SlowMine(UnitWeapon):
    def __init__(
        self, starter,
        observing_range=BALANCE.Rocket.observing_range,
        max_hp=BALANCE.Rocket.max_hp,
        a_forward=BALANCE.Rocket.a_forward,
        a_braking=BALANCE.Rocket.a_braking,
        v_forward=BALANCE.Rocket.v_forward,
        ac_max=BALANCE.Rocket.ac_max,
        max_control_speed=BALANCE.Rocket.max_control_speed,
        damage=BALANCE.Rocket.damage,
        radius_damage=BALANCE.Rocket.radius_damage,
        **kw
    ):
        # todo: docstring required
        # взять позицию и направление выпустившего ракету
        self.starter = starter
        super(SlowMine, self).__init__(position=starter.position,
                                     direction=starter.direction,
                                     r_min=10,
                                     observing_range=observing_range,
                                     max_hp=max_hp,
                                     a_forward=a_forward,
                                     a_braking=a_braking,
                                     a_backward=0.0,
                                     v_forward=v_forward,
                                     v_backward=0.0,
                                     ac_max=ac_max,
                                     max_control_speed=max_control_speed,
                                     server=starter.server,
                                     **kw)
        self.effects_to_targets = []

    def on_init(self, event):
        super(SlowMine, self).on_init(event)
        self.delete(time=event.time + 30.0)

    def on_before_delete(self, event):
        BangEvent(starter=self.main_unit, center=self.position, radius=self.radius_damage,
                  damage=self.damage).post()
        super(SlowMine, self).on_before_delete(event=event)

    def on_contact_in(self, time, obj, **kw):
        super(SlowMine, self).on_contact_in(time=time, obj=obj, **kw)
        if not self.is_target(target=obj):
            return


    def on_contact_out(self, time, obj, **kw):
        super(SlowMine, self).on_contact_out(time=time, obj=obj, **kw)
        if not self.is_target(target=obj):
            return


    @property
    def is_frag(self):
        return False

    def set_default_tags(self):
        self.tags.add(tags.RocketTag)
        self.tags.add(tags.UnZoneTag)

    @property
    def main_unit(self):
        return self.starter.main_unit

