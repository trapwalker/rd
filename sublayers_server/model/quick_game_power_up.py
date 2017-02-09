# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.units import Bot
from sublayers_server.model.agents import TeachingUser
import sublayers_server.model.tags as tags


class QuickGamePowerUpSimple(Observer):
    __str_template__ = '<{self.classname} #{self.id}>'

    def __init__(self, **kw):
        super(QuickGamePowerUpSimple, self).__init__(**kw)
        self._can_use = True

    def can_see_me(self, subj, **kw):
        return True

    def on_init(self, event):
        super(QuickGamePowerUpSimple, self).on_init(event)
        self.delete(time=event.time + self.example.life_time)

    def power_up(self, target, time):
        self._can_use = False
        log.info("%s activated for %s", self, target)

    def on_contact_in(self, time, obj, **kw):
        super(QuickGamePowerUpSimple, self).on_contact_in(time=time, obj=obj)
        if self._can_use and isinstance(obj, Bot) and obj.main_agent and isinstance(obj.main_agent, TeachingUser):
            self.power_up(target=obj, time=time)

    def set_default_tags(self):
        self.tags.add(tags.UnZoneTag)


class QuickGamePowerUpFullHeal(QuickGamePowerUpSimple):
    def power_up(self, target, time):
        super(QuickGamePowerUpFullHeal, self).power_up(time=time, target=target)
        target.set_hp(time=time, dhp=-target.hp_state.max_hp)
        self.delete(time=time)


class QuickGamePowerUpFullFuel(QuickGamePowerUpSimple):
    def power_up(self, target, time):
        super(QuickGamePowerUpFullFuel, self).power_up(time=time, target=target)
        target.set_fuel(time=time, df=target.fuel_state.max_fuel)
        self.delete(time=time)


class QuickGamePowerUpSimpleEffect(QuickGamePowerUpSimple):
    def power_up(self, target, time):
        super(QuickGamePowerUpSimpleEffect, self).power_up(time=time, target=target)
        efs = self.example.effects
        for ef in efs:
            ef.start(owner=target, time=time)
            ef.done(owner=target, time=time + self.example.effect_time)
        self.delete(time=time)
