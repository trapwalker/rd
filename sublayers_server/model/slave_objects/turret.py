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


class Turret(Slave):
    def __init__(self, time, starter, **kw):
        super(Turret, self).__init__(time=time,
                                               starter=starter,
                                               position=starter.position(time=time),
                                               server=starter.server,
                                               **kw)

    def on_init(self, event):
        super(Turret, self).on_init(event)
        self.delete(time=event.time + self.example.life_time)
        self.fire_auto_enable(enable=True, time=event.time)

    def set_default_tags(self):
        self.tags.add(tags.UnZoneTag)