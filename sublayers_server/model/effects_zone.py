# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
from effects import Effect


class EffectWood(Effect):
    def on_start(self, event):
        super(EffectWood, self).on_start(event=event)
        if self._cancel_effects():
            # меняем параметры
            owner = self.owner
            owner.p_r.current -= owner.p_r.original * 0.5
            owner._r = max(0, owner.p_r.current)

    def on_done(self, event):
        super(EffectWood, self).on_done(event=event)
        if self.actual:
            # меняем параметры обратно
            owner = self.owner
            owner.p_r.current += owner.p_r.original * 0.5
            owner._r = max(0, owner.p_r.current)


class EffectWater(Effect):
    def on_start(self, event):
        super(EffectWater, self).on_start(event=event)
        if self._cancel_effects():
            # меняем state
            log.debug('ZONES !!!!! ====== ======= ====== !!!!      In Water')

    def on_done(self, event):
        super(EffectWater, self).on_done(event=event)
        if self.actual:
            # меняем state
            log.debug('ZONES !!!!! ====== ======= ====== !!!!      Out Water')


class EffectRoad(Effect):
    def on_start(self, event):
        super(EffectRoad, self).on_start(event=event)
        if self._cancel_effects():
            # меняем state
            log.debug('ZONES !!!!! ====== ======= ====== !!!!      In Road')
            pass

    def on_done(self, event):
        super(EffectRoad, self).on_done(event=event)
        if self.actual:
            # меняем state
            log.debug('ZONES !!!!! ====== ======= ====== !!!!      Out Road')

    def done(self, time=None):
        super(EffectRoad, self).done(time=self.owner.server.get_time())


