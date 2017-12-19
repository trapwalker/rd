# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import Slave
from sublayers_server.model.events import Event
import sublayers_server.model.tags as tags


class TurretStartEvent(Event):
    def __init__(self, starter, example_turret, **kw):
        super(TurretStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter
        self.example_turret = example_turret

    def on_perform(self):
        super(TurretStartEvent, self).on_perform()
        Turret(time=self.time, starter=self.starter, example=self.example_turret)


class MaskingTurretStartEvent(Event):
    def __init__(self, starter, position, **kw):
        super(MaskingTurretStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter
        self.position = position
        self.example = starter.server.reg.get('reg:///registry/mobiles/map_weapon/stationary/turret/masking_quest_turret')

    def on_perform(self):
        super(MaskingTurretStartEvent, self).on_perform()
        MaskingQuestTurret(time=self.time,
                           position = self.position,
                           starter=self.starter,
                           example=self.example)


class Turret(Slave):
    def __init__(self, time, starter, position=None, **kw):
        super(Turret, self).__init__(time=time,
                                     starter=starter,
                                     position=position or starter.position(time=time),
                                     server=starter.server,
                                     **kw)

    def on_init(self, event):
        super(Turret, self).on_init(event)
        self.delete(time=event.time + self.example.life_time)
        self.fire_auto_enable(enable=True, time=event.time)

    def set_default_tags(self):
        self.tags.add(tags.UnZoneTag)


class MaskingQuestTurret(Turret):
    def is_target(self, target):
        return target is self.main_agent.car

    def can_i_see(self, obj, time, obj_pos=None, subj_pos=None):
        if obj is self.main_agent.car:
            return obj.v(time=time) >= 12
        else:
            return True

    def on_autofire_start(self, target, time):
        pass