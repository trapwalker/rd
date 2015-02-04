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
            owner.p_r.current -= owner.p_r.original * 0.5  # todo: взять из баланса
            owner._r = max(0, owner.p_r.current)
            owner.p_cc.current -= owner.p_cc.original * 0.3  # todo: взять из баланса
            owner.set_motion()

    def on_done(self, event):
        super(EffectWood, self).on_done(event=event)
        if self.actual:
            # меняем параметры обратно
            owner = self.owner
            owner.p_r.current += owner.p_r.original * 0.5  # todo: взять из баланса
            owner._r = max(0, owner.p_r.current)
            owner.p_cc.current += owner.p_cc.original * 0.3  # todo: взять из баланса
            owner.set_motion()


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
        log.debug('ZONES !!!!! ====== ======= ====== !!!!      In Road')
        if self._cancel_effects():
            owner = self.owner
            owner.p_cc.current += owner.p_cc.original * 0.2  # todo: взять из баланса
            owner.set_motion()
            log.debug(owner.p_cc.current)

    def on_done(self, event):
        super(EffectRoad, self).on_done(event=event)
        log.debug('ZONES !!!!! ====== ======= ====== !!!!      Out Road')
        if self.actual:
            owner = self.owner
            owner.p_cc.current -= owner.p_cc.original * 0.2  # todo: взять из баланса
            owner.set_motion()
            log.debug(owner.p_cc.current)

    def done(self, time=None):
        super(EffectRoad, self).done(time=self.owner.server.get_time())


class EffectDirt(Effect):
    def on_start(self, event):
        super(EffectDirt, self).on_start(event=event)
        log.debug('ZONES !!!!! ====== ======= ====== !!!!      In Dirt')
        if self._cancel_effects():
            owner = self.owner
            owner.p_cc.current -= owner.p_cc.original * 0.2  # todo: взять из баланса
            log.debug(owner.p_cc.current)

    def on_done(self, event):
        super(EffectDirt, self).on_done(event=event)
        log.debug('ZONES !!!!! ====== ======= ====== !!!!      Out Dirt')
        if self.actual:
            owner = self.owner
            owner.p_cc.current += owner.p_cc.original * 0.2  # todo: взять из баланса
            log.debug(owner.p_cc.current)