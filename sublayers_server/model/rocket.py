# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import Mobile
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.hp_task import HPTask
from sublayers_server.model.motion_task import MotionTask
from sublayers_server.model import messages
from sublayers_server.model.events import Event


class RocketStartEvent(Event):
    def __init__(self, starter, **kw):
        super(RocketStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter

    def on_perform(self):
        super(RocketStartEvent, self).on_perform()
        Rocket(starter=self.starter)


class Rocket(Mobile):
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
        HPTask(owner=self, dps=1.0).start()

    def on_bang_damage(self):
        for obj in self.server.geo_objects:  # todo: GEO-index clipping
            if obj is not self and not obj.limbo and obj.is_alive:  # todo: optimize filtration observers
                if self.is_target(obj):  # если вызвать self.starter.is_target - то проигнорируется дамаг по своим
                    if abs(self.position - obj.position) < self.radius_damage:
                        HPTask(owner=obj, dhp=self.damage).start()

        for agent in self.server.agents.values():
            messages.Bang(
                position=self.position,
                agent=agent,
                subj=self,
            ).post()

    def on_before_delete(self, event):
        self.on_bang_damage()
        super(Rocket, self).on_before_delete(event=event)

    def on_contact_in(self, time, obj, **kw):
        super(Rocket, self).on_contact_in(time=time, obj=obj, **kw)
        if obj is self.starter:
            return
        if isinstance(obj, Rocket):  # чтобы ракеты не врезались друг в друга
            return
        self.delete()



