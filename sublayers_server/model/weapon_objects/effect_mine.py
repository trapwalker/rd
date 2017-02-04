# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import UnitWeapon
from sublayers_server.model.events  import Event
from sublayers_server.model.weapon_objects.mine_bang import BangMine
import sublayers_server.model.tags as tags


class MineStartEvent(Event):
    def __init__(self, starter, example_mine, **kw):
        super(MineStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter
        self.example_mine = example_mine

    def on_perform(self):
        super(MineStartEvent, self).on_perform()
        if self.example_mine.__cls__ == u"MapWeaponEffectMine":
            SlowMine(time=self.time, starter=self.starter, example=self.example_mine)
        elif self.example_mine.__cls__ == u"MapWeaponBangMine":
            BangMine(time=self.time, starter=self.starter, example=self.example_mine)


class SlowMine(UnitWeapon):
    def __init__(self, time, starter, **kw):
        # todo: docstring required
        # взять позицию и направление выпустившего ракету
        super(SlowMine, self).__init__(time=time,
                                       starter=starter,
                                       position=starter.position(time=time),
                                       server=starter.server,
                                       **kw)
        self.targets = []
        self.effects = self.example.effects

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
