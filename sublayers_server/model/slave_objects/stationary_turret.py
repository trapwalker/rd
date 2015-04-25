# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import Slave
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.events import Event
import sublayers_server.model.tags as tags

u'''
    Стационарная турель!
'''

class StationaryTurretStartEvent(Event):
    def __init__(self, starter, **kw):
        super(StationaryTurretStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter

    def on_perform(self):
        super(StationaryTurretStartEvent, self).on_perform()
        StationaryTurret(time=self.time, starter=self.starter)


class StationaryTurret(Slave):
    def __init__(
        self, time, starter,
        observing_range=BALANCE.StationaryTurret.observing_range,
        max_hp=BALANCE.StationaryTurret.max_hp,
        r_min=BALANCE.StationaryTurret.r_min,
        a_forward=BALANCE.StationaryTurret.a_forward,
        a_braking=BALANCE.StationaryTurret.a_braking,
        v_forward=BALANCE.StationaryTurret.v_forward,
        ac_max=BALANCE.StationaryTurret.ac_max,
        max_control_speed=BALANCE.StationaryTurret.max_control_speed,
        weapons=BALANCE.StationaryTurret.weapons,
        **kw
    ):
        super(StationaryTurret, self).__init__(time=time,
                                               starter=starter,
                                               position=starter.position(time=time),
                                               direction=starter.direction(time=time),
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
                                               weapons=weapons,
                                               **kw)

    def on_init(self, event):
        super(StationaryTurret, self).on_init(event)
        self.delete(time=event.time + 90.0)
        self.fire_auto_enable(enable=True, time=event.time)

    def set_default_tags(self):
        self.tags.add(tags.UnZoneTag)