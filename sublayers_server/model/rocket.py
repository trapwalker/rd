# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import Mobile
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.hp_task import HPTask
from sublayers_server.model import messages


class Rocket(Mobile):
    def __init__(
        self, starter, 
        life_time=BALANCE.Rocket.life_time,
        observing_range=BALANCE.Rocket.observing_range,
        max_hp=BALANCE.Rocket.max_hp,
        a_accelerate=BALANCE.Rocket.a_accelerate,
        a_braking=BALANCE.Rocket.a_braking,
        v_max=BALANCE.Rocket.v_max,
        ac_max=BALANCE.Rocket.ac_max,
        max_control_speed=BALANCE.Rocket.max_control_speed,
        **kw
    ):
        # todo: docstring required
        # взять позицию и направление выпустившего ракету
        self.starter = starter
        pos = starter.position
        direct = starter.direction
        self.state = None
        self.life_time = life_time
        super(Rocket, self).__init__(position=pos, direction=direct,
                                     observing_range=observing_range,
                                     max_hp=max_hp,
                                     a_accelerate=a_accelerate,
                                     a_braking=a_braking,
                                     v_max=v_max,
                                     ac_max=ac_max,
                                     max_control_speed=max_control_speed,
                                     **kw)


    def on_init(self, event):
        super(Rocket, self).on_init(event)
        self.set_motion(cc=1.0)
        HPTask(owner=self, dps=1.0)
        self.delete(time=self.server.get_time() + self.life_time)

    def on_stop(self, event):
        self.delete()

    def init_state_params(self, r_min, ac_max, v_max, a_accelerate, a_braking):
        v_starter = self.starter.v
        return dict(
            p=self.starter.position,
            fi=self.starter.direction,
            a_accelerate=a_accelerate,
            r_min=r_min,
            v_max=v_max,
            ac_max=ac_max,
            a_braking=a_braking,
            v=v_starter if v_starter > 1.0 else 0.0,
            cc=0.0,
        )

    def on_contact_in(self, time, obj, **kw):
        #log.debug('Rocket Contacn IN')
        super(Rocket, self).on_contact_in(time=time, obj=obj, **kw)
        if self.hp <= 0:
            return
        if obj is self.starter:
            return
        if isinstance(obj, Rocket):  # чтобы ракеты не врезались друг в друга
            return
        log.debug('Rocket Contacn IN !!!!!!!!!!!!!!!')
        # todo: сделать евент (не мессадж, а именно евент) Bang, который будет отнимать хп у задетых машинок
        for agent in self.subscribed_agents:
            messages.Bang(
                position=self.position,
                agent=agent,
                time=time,
                subj=self,
            ).post()

        self.delete()

    def on_die(self, event):
        self.set_motion(cc=0.0)
