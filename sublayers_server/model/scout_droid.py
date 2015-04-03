# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import Mobile
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.hp_task import HPTask
from sublayers_server.model.motion_task import MotionTask
from sublayers_server.model import messages
from sublayers_server.model.events import Event


class ScoutDroidStartEvent(Event):
    def __init__(self, starter, target, **kw):
        super(ScoutDroidStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter
        self.target = target

    def on_perform(self):
        super(ScoutDroidStartEvent, self).on_perform()
        ScoutDroid(starter=self.starter, target=self.target)


class ScoutDroid(Mobile):
    def __init__(
        self, starter, target,
        observing_range=BALANCE.ScoutDroid.observing_range,
        max_hp=BALANCE.ScoutDroid.max_hp,
        r_min=BALANCE.ScoutDroid.r_min,
        a_forward=BALANCE.ScoutDroid.a_forward,
        a_braking=BALANCE.ScoutDroid.a_braking,
        v_forward=BALANCE.ScoutDroid.v_forward,
        ac_max=BALANCE.ScoutDroid.ac_max,
        max_control_speed=BALANCE.ScoutDroid.max_control_speed,
        **kw
    ):
        self.starter = starter
        self.target = target
        super(ScoutDroid, self).__init__(position=starter.position,
                                     direction=starter.direction,
                                     r_min=r_min,
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
        super(ScoutDroid, self).on_init(event)
        self.starter.owner.append_obj(self)
        MotionTask(owner=self, cc=1.0, target_point=self.target).start()
        HPTask(owner=self, dps=1.0).start()

    def on_before_delete(self, **kw):
        self.starter.owner.drop_obj(self)
        super(ScoutDroid, self).on_before_delete(**kw)

    @property
    def is_frag(self):
        return False


