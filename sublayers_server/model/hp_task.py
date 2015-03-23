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
    def __init__(self, dhp=None, dps=None, add_shooter=None, del_shooter=None, **kw):
        super(HPTask, self).__init__(**kw)
        assert self.owner.hp_state is not None
        self.dhp = dhp
        self.dps = dps
        self.add_shooter = add_shooter
        self.del_shooter = del_shooter

    def _update_state(self, event):
        owner = self.owner
        if event.is_die:
            owner.hp_state.set_die(event.time)
            Die(time=event.time, obj=owner).post()
            return
        owner.hp_state.update(t=event.time, dhp=event.dhp, dps=event.dps)
        owner.on_update(event=event)

    def on_perform(self, event):
        super(HPTask, self).on_perform(event=event)
        self._update_state(event)

    def on_start(self, event):
        super(HPTask, self).on_start(event=event)
        owner = self.owner

        if self.add_shooter:
            owner.hp_state.add_shooter(self.add_shooter)
            for agent in self.owner.subscribed_agents.get_keys_more_value():
                FireAutoEffect(agent=agent, subj=self.add_shooter, obj=self.owner, action=True).post()
        if self.del_shooter:
            owner.hp_state.del_shooter(self.del_shooter)
            for agent in self.owner.subscribed_agents.get_keys_more_value():
                FireAutoEffect(agent=agent, subj=self.del_shooter, obj=self.owner, action=False).post()

        time = event.time
        time_die = copy(owner.hp_state).update(t=time, dhp=self.dhp, dps=self.dps)
        if time_die == time:  # если время дамага совпадает с временем смерти, то один евент
            HPTaskEvent(time=time, task=self, dhp=self.dhp, dps=self.dps, is_die=True).post()
        else:  # если времена разные, то добавить оба евента
            HPTaskEvent(time=time, task=self, dhp=self.dhp, dps=self.dps).post()
            if time_die is not None:
                HPTaskEvent(time=time_die, task=self, is_die=True).post()
