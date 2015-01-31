# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
from effects import Effect


class EffectWood(Effect):
    def _cancel_effects(self):
        do_diff = True
        for effect in self.owner.effects:
            if effect != self and isinstance(effect, EffectWood) and effect.actual:
                effect.actual = False
                do_diff = False
        return do_diff

    def on_start(self, event):
        super(EffectWood, self).on_start(event=event)
        if self._cancel_effects():
            # меняем state
            log.debug('ZONES !!!!! ====== ======= ====== !!!!      In Wood')

    def on_done(self, event):
        super(EffectWood, self).on_done(event=event)
        if self.actual:
            # меняем state
            log.debug('ZONES !!!!! ====== ======= ====== !!!!      Out Wood')


class EffectWater(Effect):
    def _cancel_effects(self):
        do_diff = True
        for effect in self.owner.effects:
           if effect != self and isinstance(effect, EffectWater) and effect.actual:
                effect.actual = False
                do_diff = False
        return do_diff

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
    def _cancel_effects(self):
        do_diff = True
        for effect in self.owner.effects:
            if effect != self and isinstance(effect, EffectRoad) and effect.actual:
                effect.actual = False
                do_diff = False
        return do_diff

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
        super(EffectRoad, self).done(time=self.owner.server.get_time() + 10)


