# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import UnitWeapon
from sublayers_server.model.events  import Event
import sublayers_server.model.tags as tags


class SlowMineStartEvent(Event):
    def __init__(self, starter, example_mine, **kw):
        super(SlowMineStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter
        self.example_mine = example_mine

    def on_perform(self):
        super(SlowMineStartEvent, self).on_perform()
        # todo: забирать названия эффектов из экзампла  self.example_mine.effects (использовать URI эффекта)
        ef = self.server.reg['effects/weapon/mines/effect_mine_cc']
        SlowMine(time=self.time, starter=self.starter, example=self.example_mine, effects=[ef] if ef else [])


class SlowMine(UnitWeapon):
    def __init__(self, time, starter, effects, **kw):
        # todo: docstring required
        # взять позицию и направление выпустившего ракету
        super(SlowMine, self).__init__(time=time,
                                       starter=starter,
                                       position=starter.position(time=time),
                                       server=starter.server,
                                       **kw)
        self.targets = []
        self.effects = effects  # todo: забирать названия эффектов из экзампла

    def on_init(self, event):
        super(SlowMine, self).on_init(event)
        self.delete(time=event.time + 30.0)

    def _on_effects(self, obj, time):
        if obj not in self.targets:
            self.targets.append(obj)
            for effect in self.effects:
                effect.start(owner=obj, time=time)

    def _off_effects(self, obj, time):
        if obj in self.targets:
            for effect in self.effects:
                effect.done(owner=obj, time=time)
            self.targets.remove(obj)

    def on_before_delete(self, event):
        targets = self.targets[:]
        for target in targets:
            self._off_effects(obj=target, time=event.time)
        assert len(self.targets) == 0
        super(SlowMine, self).on_before_delete(event=event)

    def on_contact_in(self, time, obj, **kw):
        super(SlowMine, self).on_contact_in(time=time, obj=obj)
        if not self.is_target(target=obj):
            return
        # if tags.FlyingUnit in obj.tags:
        #     return
        self._on_effects(obj=obj, time=time)

    def on_contact_out(self, time, obj, **kw):
        super(SlowMine, self).on_contact_out(time=time, obj=obj, **kw)
        self._off_effects(obj=obj, time=time)

    def set_default_tags(self):
        self.tags.add(tags.UnZoneTag)
