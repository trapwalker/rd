# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.units import UnitWeapon
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.events  import Event
import sublayers_server.model.tags as tags


class SlowMineStartEvent(Event):
    def __init__(self, starter, **kw):
        super(SlowMineStartEvent, self).__init__(server=starter.server, **kw)
        self.starter = starter

    def on_perform(self):
        super(SlowMineStartEvent, self).on_perform()
        effects = self.server.effects
        SlowMine(time=self.time, starter=self.starter, effects=[effects.get('EffectMineCC')])


class SlowMine(UnitWeapon):
    def __init__(
        self, time, starter, effects,
        observing_range=BALANCE.SlowMine.observing_range,
        max_hp=BALANCE.SlowMine.max_hp,
        a_forward=BALANCE.SlowMine.a_forward,
        a_braking=BALANCE.SlowMine.a_braking,
        v_forward=BALANCE.SlowMine.v_forward,
        ac_max=BALANCE.SlowMine.ac_max,
        max_control_speed=BALANCE.SlowMine.max_control_speed,
        **kw
    ):
        # todo: docstring required
        # взять позицию и направление выпустившего ракету
        super(SlowMine, self).__init__(time=time,
                                       starter=starter,
                                       position=starter.position(time=time),
                                       direction=starter.direction(time=time),
                                       r_min=10,
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
        self.targets = []
        self.effects = effects[:]

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
        super(SlowMine, self).on_contact_in(time=time, obj=obj, **kw)
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