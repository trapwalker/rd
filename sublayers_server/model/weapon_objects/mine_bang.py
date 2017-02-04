# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import UnitWeapon, Slave
from sublayers_server.model.events import BangEvent, Event, Objective
import sublayers_server.model.tags as tags


class MineBangActivateEvent(Objective):
    def on_perform(self):
        super(MineBangActivateEvent, self).on_perform()
        self.obj.activate(self)


class BangMine(Slave):
    def __init__(self, time, starter, **kw):
        super(BangMine, self).__init__(time=time,
                                       starter=starter,
                                       position=starter.position(time=time),
                                       server=starter.server,
                                       **kw)
        self._activated_event = MineBangActivateEvent(obj=self, time=time + 4.0).post()
        self._mine_is_active = False

    def on_init(self, event):
        super(BangMine, self).on_init(event)
        self.delete(time=event.time + self.example.life_time)

    def activate(self, event):
        self._mine_is_active = True
        for obj in self.visible_objects:
            if self.is_target(target=obj):
                self._on_bang(time=event.time)

    def _on_bang(self, time):
        if not self._mine_is_active:
            return
        self._mine_is_active = False
        BangEvent(starter=self.main_unit, center=self.position(time=time), radius=self.example.radius_damage,
                  damage=self.example.damage, time=time).post()
        self.delete(time=time)

    def on_contact_in(self, time, obj, **kw):
        log.info('mine on_contact_in %s', obj)
        super(BangMine, self).on_contact_in(time=time, obj=obj)
        if self.is_target(target=obj):
            self._on_bang(time=time)

    def set_default_tags(self):
        self.tags.add(tags.UnZoneTag)
