# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from units import Mobile, Bot
from state import State
from balance import BALANCE
import events
import messages


class Rocket(Mobile):
    def __init__(self, starter, life_time=BALANCE.Rocket.life_time, **kw):
        # todo: docstring required
        # взять позицию и направление выпустившего ракету
        self.starter = starter
        pos = starter.position
        direct = starter.direction
        self.state = None
        super(Rocket, self).__init__(position=pos, direction=direct,
                                     max_hp=BALANCE.Rocket.max_hp,
                                     observing_range=BALANCE.Rocket.observing_range,
                                     max_velocity=BALANCE.Rocket.v_max,
                                     **kw)

        # Назначаем остановку
        events.Update(subj=self, time=self.server.get_time() + life_time, comment="Bang!!!!").send()

    def on_stop(self, event):
        self.delete()

    def init_params(self):
        self.state = State(
            owner=self,
            t=self.server.get_time(),
            p=self.starter.position,
            fi=self.starter.direction,
            a_accelerate=BALANCE.Rocket.a_accelerate,
            a=BALANCE.Rocket.a_accelerate,
            v_max=BALANCE.Rocket.v_max,
            ac_max=BALANCE.Rocket.ac_max,
            a_braking=BALANCE.Rocket.a_braking,
            v=self.starter.v,
            cc=0.0
        )
        # если так не сделать, то не работают нормально Update евенты
        #self.set_cc(value=1.0)

    def on_contact_in(self, time, obj, **kw):
        #log.debug('Rocket Contacn IN')
        #super(Rocket, self).on_contact_in(**kw)
        if obj is self.starter:
            return
        # todo: сделать евент (не мессадж, а именно евент) Bang, который будет отнимать хп у всего списка машинок, которые ракета задела
        if not isinstance(obj, Bot):  # чтобы ракеты не врезались друг в друга
            return

        for agent in self.subscribed_agents:
            self.server.post_message(messages.Bang(
                position=self.position,
                agent=agent,
                time=time,
                subj=self,
            ))

        self.delete()
