# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import UnitWeapon
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.events  import Event, BangEvent
import sublayers_server.model.tags as tags


class RocketStartEvent(Event):
    def __init__(self, starter, **kw):
        super(RocketStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter

    def on_perform(self):
        super(RocketStartEvent, self).on_perform()
        Rocket(time=self.time, starter=self.starter)


class Rocket(UnitWeapon):
    def __init__(
        self, starter, time,
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
        super(Rocket, self).__init__(time=time,
                                     starter=starter,
                                     position=starter.position(time=time),
                                     direction=starter.direction(time=time),
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
        self.radius_damage = radius_damage
        self.damage = damage

    def on_init(self, event):
        super(Rocket, self).on_init(event)
        self.set_motion(cc=1.0, time=event.time)
        self.delete(time=event.time + 180.0)

    def on_before_delete(self, event):
        BangEvent(starter=self.main_unit, center=self.position(time=event.time), radius=self.radius_damage,
                  damage=self.damage, time=event.time).post()
        super(Rocket, self).on_before_delete(event=event)

    def on_contact_in(self, time, obj, **kw):
        super(Rocket, self).on_contact_in(time=time, obj=obj, **kw)
        if not self.is_target(target=obj):  # нельзя взрываться о тех, кто не является целью для main_agent'а
            return
        if tags.RocketTag in obj.tags:  # чтобы ракеты не врезались друг в друга
            return

        self.delete(time=time)

    def set_default_tags(self):
        self.tags.add(tags.RocketTag)
        # self.tags.add(tags.UnZoneTag)


