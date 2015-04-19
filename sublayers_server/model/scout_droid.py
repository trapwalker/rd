# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import Slave
from sublayers_server.model.balance import BALANCE
from sublayers_server.model import messages
from sublayers_server.model.events import Event
import sublayers_server.model.tags as tags

u'''
    Двигающаяся турель! Дрон-разведчик.
'''

class ScoutDroidStartEvent(Event):
    def __init__(self, starter, target, **kw):
        super(ScoutDroidStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter
        self.target = target

    def on_perform(self):
        super(ScoutDroidStartEvent, self).on_perform()
        ScoutDroid(time=self.time, starter=self.starter, target=self.target)


class ScoutDroid(Slave):
    def __init__(
        self, time, starter, target,
        observing_range=BALANCE.ScoutDroid.observing_range,
        max_hp=BALANCE.ScoutDroid.max_hp,
        r_min=BALANCE.ScoutDroid.r_min,
        a_forward=BALANCE.ScoutDroid.a_forward,
        a_braking=BALANCE.ScoutDroid.a_braking,
        v_forward=BALANCE.ScoutDroid.v_forward,
        ac_max=BALANCE.ScoutDroid.ac_max,
        max_control_speed=BALANCE.ScoutDroid.max_control_speed,
        weapons=BALANCE.ScoutDroid.weapons,
        max_fuel=BALANCE.ScoutDroid.max_fuel,
        fuel=BALANCE.ScoutDroid.fuel,
        **kw
    ):
        super(ScoutDroid, self).__init__(time=time,
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
                                         max_fuel=max_fuel,
                                         fuel=fuel,
                                         **kw)
        self.target = target

    def on_init(self, event):
        super(ScoutDroid, self).on_init(event)
        self.set_motion(cc=1.0, target_point=self.target, time=event.time)
        self.delete(time=event.time + 30.0)
        self.fire_auto_enable_all(enable=True, time=event.time)

    def set_default_tags(self):
        self.tags.add(tags.UnZoneTag)


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
        self.fire_auto_enable_all(enable=True, time=event.time)

