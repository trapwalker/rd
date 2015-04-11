# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.effects import Effect
from sublayers_server.model.hp_task import HPTask
from sublayers_server.model.messages import ZoneEffectMessage
import sublayers_server.model.tags as tags


class EffectZone(Effect):
    def send_message(self):
        ZoneEffectMessage(
            agent=self.owner.owner,
            subj=self.owner,
            in_zone=self.actual,
            zone_effect=self.as_dict(),
        ).post()


class EffectWood(EffectZone):
    def on_start(self, event):
        super(EffectWood, self).on_start(event=event)
        # log.debug('ZONES !!!!! ====== ======= ====== !!!!      In Road')
        if self._cancel_effects():
            # меняем параметры
            owner = self.owner
            # todo: взять коэффициенты из баланса
            owner.p_visibility.current -= owner.p_visibility.original * 0.5
            owner.p_observing_range.current -= owner.p_observing_range.original * 0.5
            owner.p_cc.current -= owner.p_cc.original * 0.3
            owner.set_motion()
            self.send_message()

    def on_done(self, event):
        super(EffectWood, self).on_done(event=event)
        # log.debug('ZONES !!!!! ====== ======= ====== !!!!      Out Road')
        if self.actual:
            # меняем параметры обратно
            self.actual = False
            owner = self.owner
            # todo: взять коэффициенты из баланса
            owner.p_visibility.current += owner.p_visibility.original * 0.5
            owner.p_observing_range.current += owner.p_observing_range.original * 0.5
            owner.p_cc.current += owner.p_cc.original * 0.3
            owner.set_motion()
            self.send_message()


class EffectWater(EffectZone):
    def on_start(self, event):
        super(EffectWater, self).on_start(event=event)
        # log.debug('ZONES !!!!! ====== ======= ====== !!!!      In Water')
        if self._cancel_effects():
            owner = self.owner
            # todo: взять коэффициенты из баланса
            owner.p_cc.current -= owner.p_cc.original * 0.45
            owner.set_motion()
            HPTask(owner=owner, dps=0.5).start()
            self.send_message()

    def on_done(self, event):
        super(EffectWater, self).on_done(event=event)
        # log.debug('ZONES !!!!! ====== ======= ====== !!!!      Out Water')
        if self.actual:
            self.actual = False
            owner = self.owner
            # todo: взять коэффициенты из баланса
            owner.p_cc.current += owner.p_cc.original * 0.45
            owner.set_motion()
            HPTask(owner=owner, dps=-0.5).start()
            self.send_message()


class EffectRoad(EffectZone):
    def on_start(self, event):
        super(EffectRoad, self).on_start(event=event)
        #log.debug('ZONES !!!!! ====== ======= ====== !!!!      In Road')
        if self._cancel_effects():
            owner = self.owner
            # todo: взять коэффициенты из баланса
            owner.p_visibility.current += owner.p_visibility.original * 0.2
            owner.p_cc.current += owner.p_cc.original * 0.2
            owner.set_motion()
            self.send_message()

    def on_done(self, event):
        super(EffectRoad, self).on_done(event=event)
        #log.debug('ZONES !!!!! ====== ======= ====== !!!!      Out Road')
        if self.actual:
            self.actual = False
            owner = self.owner
            # todo: взять коэффициенты из баланса
            owner.p_visibility.current -= owner.p_visibility.original * 0.2
            owner.p_cc.current -= owner.p_cc.original * 0.2
            owner.set_motion()
            self.send_message()

    def done(self, time=None):
        super(EffectRoad, self).done(time=self.owner.server.get_time())


class EffectDirt(EffectZone):
    def start(self):
        if tags.UnZoneTag not in self.owner.tags:
            super(EffectDirt, self).start()

    def on_start(self, event):
        super(EffectDirt, self).on_start(event=event)
        #log.debug('ZONES !!!!! ====== ======= ====== !!!!      In Dirt')
        if self._cancel_effects():
            owner = self.owner
            # todo: взять коэффициенты из баланса
            owner.p_cc.current -= owner.p_cc.original * 0.2
            self.send_message()

    def on_done(self, event):
        super(EffectDirt, self).on_done(event=event)
        #log.debug('ZONES !!!!! ====== ======= ====== !!!!      Out Dirt')
        if self.actual:
            self.actual = False
            owner = self.owner
            # todo: взять коэффициенты из баланса
            owner.p_cc.current += owner.p_cc.original * 0.2
            self.send_message()