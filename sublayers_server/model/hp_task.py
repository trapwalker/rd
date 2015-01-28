# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
from tasks import Task, TaskPerformEvent
from copy import copy
from events import Die


class HPTaskEvent(TaskPerformEvent):
    def __init__(self, dhp=None, dps=None, is_die=False, **kw):
        super(HPTaskEvent, self).__init__(**kw)
        self.dhp = dhp
        self.dps = dps
        self.is_die = is_die


class HPTask(Task):
    def __init__(self, dhp=None, dps=None, **kw):
        super(HPTask, self).__init__(**kw)
        assert self.owner.hp_state is not None
        self.dhp = dhp
        self.dps = dps

    def _update_state(self, event):
        owner = self.owner
        if event.is_die:
            owner.hp_state.set_die(event.time)
            Die(time=event.time, obj=owner).post()
            return
        owner.hp_state.update(t=event.time, dhp=event.dhp, dps=event.dps)
        owner.on_update(event=event)

    def _clear_hp_tasks(self, event):
        time = event.time
        tasks = self.owner.tasks[:]
        for task in tasks:
            if task != self and isinstance(task, HPTask):
                events = task.events[:]
                for e in events:
                    if e.time > time:  # die может произойти раньше
                        e.cancel()

    def on_perform(self, event):
        super(HPTask, self).on_perform(event=event)
        self._update_state(event)

    def on_start(self, event):
        owner = self.owner
        self._clear_hp_tasks(event)
        time = event.time
        time_die = copy(owner.hp_state).update(t=time, dhp=self.dhp, dps=self.dps)
        if time_die == time:  # если время дамага совпадает с временем смерти, то один евент
            HPTaskEvent(time=time, task=self, dhp=self.dhp, dps=self.dps, is_die=True).post()
        else:  # если времена разные, то добавить оба евента
            HPTaskEvent(time=time, task=self, dhp=self.dhp, dps=self.dps).post()
            if time_die is not None:
                HPTaskEvent(time=time_die, task=self, is_die=True).post()
