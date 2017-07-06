# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.tasks import TaskPerformEvent, TaskSingleton
from sublayers_server.model.events import Die
from sublayers_server.model.messages import FireAutoEffect

from copy import copy


class HPTaskEvent(TaskPerformEvent):
    def __init__(self, dhp=None, dps=None, is_die=False, **kw):
        super(HPTaskEvent, self).__init__(**kw)
        self.dhp = dhp
        self.dps = dps
        self.is_die = is_die


class HPTask(TaskSingleton):
    def __init__(self, dhp=None, dps=None, add_shooter=None, del_shooter=None, shooter=None, add_weapon=None,
                 del_weapon=None, **kw):
        super(HPTask, self).__init__(**kw)
        assert self.owner.hp_state is not None
        self.dhp = dhp
        self.dps = dps
        self.add_shooter = add_shooter
        self.del_shooter = del_shooter
        self.shooter = shooter
        self.add_weapon = add_weapon
        self.del_weapon = del_weapon

    def _update_state(self, dhp, dps, is_die, event):
        owner = self.owner
        if owner.hp_state._is_die:
            return
        if is_die:
            owner.hp_state.set_die(event.time)
            killer = None
            if owner.is_frag:
                if self.shooter is not None:
                    self.shooter.on_kill(event=event, obj=owner)
                    killer = self.shooter
                else:
                    # todo: Определение того, кто застрелил, если стрелков много
                    if owner.hp_state.shooters:
                        owner.hp_state.shooters[0].on_kill(event=event, obj=owner)
            Die(time=event.time, obj=owner, killer=killer).post()
            return
        owner.hp_state.update(t=event.time, dhp=dhp, dps=dps)
        owner.on_update(event=event)

    def on_perform(self, event):
        super(HPTask, self).on_perform(event=event)
        self._update_state(dhp=event.dhp, dps=event.dps, is_die=event.is_die, event=event)

    def on_start(self, event):
        super(HPTask, self).on_start(event=event)
        owner = self.owner

        if self.add_weapon is not None:
            owner.hp_state.add_weapon(self.add_weapon)
        if self.del_weapon is not None:
            owner.hp_state.del_weapon(self.del_weapon)

        if self.add_shooter:
            owner.hp_state.add_shooter(self.add_shooter)
            for agent in self.owner.subscribed_agents:
                FireAutoEffect(agent=agent, subj=self.add_shooter, obj=self.owner, action=True, time=event.time).post()
        if self.del_shooter:
            owner.hp_state.del_shooter(self.del_shooter)
            for agent in self.owner.subscribed_agents:
                FireAutoEffect(agent=agent, subj=self.del_shooter, obj=self.owner, action=False, time=event.time).post()

        if self.add_shooter or self.shooter:
            damage_type = 'dhp' if self.shooter else 'dps'
            owner.on_get_damage(event=event, damager=self.add_shooter or self.shooter, damage_type=damage_type)

        # info Раньше вызывались эвенты, сейчас self._update_state вызывается сразу, так как если был вызван HPTask,
        # то мы обязаны сделать апдейт hp_state, иначе списывание дамага может не прекратиться.
        time = event.time
        time_die = copy(owner.hp_state).update(t=time, dhp=self.dhp, dps=self.dps)
        if time_die == time:  # если время дамага совпадает с временем смерти, то просто сделать апдейт и вызвать "Die"
            self._update_state(dhp=self.dhp, dps=self.dps, is_die=True, event=event)
            self.done()
        else:  # если времена разные, то сделать апдейт и добавить евента на смерть
            self.shooter = None
            self._update_state(dhp=self.dhp, dps=self.dps, is_die=False, event=event)
            if time_die is not None:
                HPTaskEvent(time=time_die, task=self, is_die=True).post()
            else:
                self.done()
