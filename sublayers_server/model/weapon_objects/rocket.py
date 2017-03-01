# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import UnitWeapon
from sublayers_server.model.events  import Event, BangEvent, Objective
import sublayers_server.model.tags as tags


class RocketStartEvent(Event):
    def __init__(self, starter, example_rocket, **kw):
        super(RocketStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter
        self.example_rocket = example_rocket

    def on_perform(self):
        super(RocketStartEvent, self).on_perform()
        Rocket(time=self.time, starter=self.starter, example=self.example_rocket)


class RocketActivateEvent(Objective):
    def on_perform(self):
        super(RocketActivateEvent, self).on_perform()
        self.obj.activate(self)


class Rocket(UnitWeapon):
    def __init__(self, time, starter, direction=0, **kw):
        # взять позицию и направление выпустившего ракету
        starter.main_agent.log.info('start rocket with direction=%s', starter.direction(time=time))
        self._rocket_starter_v = starter.v(time)
        super(Rocket, self).__init__(time=time,
                                     starter=starter,
                                     position=starter.position(time=time),
                                     direction=starter.direction(time=time),
                                     server=starter.server,
                                     **kw)
        self.radius_damage = self.example.radius_damage
        self.damage = self.example.damage

        self._activated_event = RocketActivateEvent(obj=self, time=time + 2.0).post()
        self._rocket_is_active = False

    def activate(self, event):
        self._rocket_is_active = True
        for obj in self.visible_objects:
            if self.is_target(target=obj):
                self._on_bang(time=event.time)
                self.delete(time=event.time)

    def as_dict(self, time):
        d = super(Rocket, self).as_dict(time=time)
        d.update(icon_name=self.example.icon_name)
        return d

    def init_state_params(self):
        d = super(Rocket, self).init_state_params()
        d.update(v=self._rocket_starter_v)
        return d

    def on_init(self, event):
        super(Rocket, self).on_init(event)
        self.set_motion(cc=1.0, time=event.time)
        self.delete(time=event.time + self.example.life_time)

    def on_before_delete(self, event):
        self._on_bang(time=event.time)
        super(Rocket, self).on_before_delete(event=event)

    def _on_bang(self, time):
        if not self._rocket_is_active:
            return
        self._rocket_is_active = False
        BangEvent(damager=self, center=self.position(time=time), radius=self.radius_damage,
                  damage=self.damage, time=time).post()

    def on_contact_in(self, time, obj):
        super(Rocket, self).on_contact_in(time=time, obj=obj)
        if not self.is_target(target=obj):  # нельзя взрываться о тех, кто не является целью для main_agent'а
            return
        if tags.RocketTag in obj.tags:  # чтобы ракеты не врезались друг в друга
            return
        self._on_bang(time=time)
        self.delete(time=time)

    def set_default_tags(self):
        self.tags.add(tags.RocketTag)
        self.tags.add(tags.UnZoneTag)
