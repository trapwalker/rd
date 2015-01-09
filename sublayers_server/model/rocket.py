# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from units import Mobile, Bot
from state import State
from balance import BALANCE
import events
import messages


class Rocket(Mobile):
    def __init__(
        self, starter, 
        life_time=BALANCE.Rocket.life_time, 
        max_hp=BALANCE.Rocket.max_hp,
        max_velocity=BALANCE.Rocket.velocity,
        observing_range=BALANCE.Rocket.observing_range,
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
                                     max_hp=max_hp,
                                     observing_range=observing_range,
                                     max_velocity=max_velocity,
                                     **kw)

    def on_init(self, event):
        # Запускаем:
        #events.Update(obj=self, cc=1.0).send()
        # Назначаем остановку:
        #events.Update(obj=self, cc=0.0, time=self.server.get_time() + self.life_time, comment="Bang!!!!").send()
        self.delete(time=self.server.get_time() + self.life_time)

    def on_stop(self, event):
        self.delete()

    def init_state_params(self):
        return dict(
            p=self.starter.position,
            fi=self.starter.direction,
            a_accelerate=BALANCE.Rocket.a_accelerate,  # todo: defoult settings injection
            v_max=self.max_velocity,
            ac_max=BALANCE.Rocket.ac_max,
            a_braking=BALANCE.Rocket.a_braking,
            v=self.starter.v,
            cc=1.0,
        )

    def on_contact_in(self, time, obj, **kw):
        #log.debug('Rocket Contacn IN')
        #super(Rocket, self).on_contact_in(**kw)
        if obj is self.starter:
            return
        # todo: сделать евент (не мессадж, а именно евент) Bang, который будет отнимать хп у задетых машинок
        if not isinstance(obj, Bot):  # чтобы ракеты не врезались друг в друга
            return
        log.debug('Rocket Contacn IN !!!!!!!!!!!!!!!')
        for agent in self.subscribed_agents:
            messages.Bang(
                position=self.position,
                agent=agent,
                time=time,
                subj=self,
            ).post()

        self.delete()
