# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import UnitWeapon, Slave
from sublayers_server.model.events import BangEvent
import sublayers_server.model.tags as tags


class BangMine(Slave):
    def __init__(self, time, starter, **kw):
        # todo: docstring required
        super(BangMine, self).__init__(time=time,
                                       starter=starter,
                                       position=starter.position(time=time),
                                       server=starter.server,
                                       **kw)

    def on_init(self, event):
        super(BangMine, self).on_init(event)
        self.delete(time=event.time + self.example.life_time)

    def _on_bang(self, time):
        BangEvent(starter=self.main_unit, center=self.position(time=time), radius=self.example.radius_damage,
                  damage=self.example.damage, time=time).post()
        self.delete(time=time)

    def on_contact_in(self, time, obj, **kw):
        super(BangMine, self).on_contact_in(time=time, obj=obj)
        if not self.is_target(target=obj):
            return
        self._on_bang(time=time)

    def set_default_tags(self):
        self.tags.add(tags.UnZoneTag)
