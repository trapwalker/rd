# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.units import Bot
from sublayers_server.model.agents import TeachingUser
from sublayers_server.model.inventory import ItemState
import sublayers_server.model.tags as tags
from sublayers_server.model.events import Objective, Event
from sublayers_server.model.game_log_messages import PowerUPLogMessage
from sublayers_server.model.messages import Subjective, QuickGameChangePoints
from sublayers_server.model.agents import QuickUser
import random


class PowerUpAnimateHide(Subjective):
    u""" Мессадж отправляется только в случае, если Power Up был кем-то подобран """
    pass


class QuickGamePowerUpSimple(Observer):
    __str_template__ = '<{self.classname} #{self.id}>'

    def __init__(self, **kw):
        super(QuickGamePowerUpSimple, self).__init__(**kw)
        self._can_use = True
        self.icon_name = self.example.icon_name
        if random.random() > 0.85:
            self.icon_name = "icon-power-up-random"

    def can_see_me(self, subj, **kw):
        return True

    def on_init(self, event):
        super(QuickGamePowerUpSimple, self).on_init(event)
        self.delete(time=event.time + self.example.life_time)

    def as_dict(self, time):
        d = super(QuickGamePowerUpSimple, self).as_dict(time=time)
        d.update(icon_name=self.icon_name)
        return d

    def power_up(self, target, time):
        self._can_use = False
        target.main_agent.log.info("%s activated for %s", self, target)
        PowerUpAnimateHide(agent=target.main_agent, time=time, subj=self).post()

        if isinstance(target.main_agent, QuickUser):
            target.main_agent.bonus_points += 10
            QuickGameChangePoints(agent=target.main_agent, time=time).post()
        PowerUPLogMessage(agent=target.main_agent, time=time, comment=self.example.activate_comment,
                          position=self.position(time)).post()

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


class QuickGamePowerUpEffect(QuickGamePowerUpSimple):
    def power_up(self, target, time):
        super(QuickGamePowerUpEffect, self).power_up(time=time, target=target)
        efs = self.example.effects
        for ef in efs:
            ef.start(owner=target, time=time)
            ef.done(owner=target, time=time + self.example.effect_time)
        self.delete(time=time)


class QuickGamePowerUpShield(QuickGamePowerUpSimple):
    def power_up(self, target, time):
        super(QuickGamePowerUpShield, self).power_up(time=time, target=target)

        def disable_shield(event):
            target.params.get('p_armor').current -= 100
            target.restart_weapons(time=event.time)
            target.on_update(event)

        target.params.get('p_armor').current += 100
        target.restart_weapons(time=time)
        target.on_update(Event(server=self.server, time=time))

        Objective(obj=target, time=time + self.example.duration_time, callback_after=disable_shield).post()

        self.delete(time=time)


class QuickGamePowerUpAddItems(QuickGamePowerUpSimple):
    def power_up(self, target, time):
        super(QuickGamePowerUpAddItems, self).power_up(time=time, target=target)
        for item_proto in self.example.items:
            item_example = item_proto.instantiate(amount=item_proto.stack_size)
            item_state = ItemState(self.server, time=time, example=item_example, count=item_example.stack_size)
            item_state.set_inventory(time=time, inventory=target.inventory)
            # target.inventory.add_item(item=item_state, time=time)
        self.delete(time=time)