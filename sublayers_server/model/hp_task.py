# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
from tasks import Task, TaskEvent
from hp_state import HPState
from events import Die

class HPTaskEvent(TaskEvent):
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
        self.is_hp_start = False

    def _update_state(self, event):
        owner = self.owner
        if event.is_die:
            Die(server=owner.server, time=event.time, obj=owner).post()
            return
        owner.hp_state.update(t=event.time, dhp=event.dhp, dps=event.dps)
        owner.on_update(event=event)

    def _clear_hp_tasks(self, event):
        owner = self.owner
        time = event.time
        tasks = owner.tasks[:]
        for task in tasks:
            if task != self and isinstance(task, HPTask):
                events = task.events[:]
                for e in events:
                    if e.time > time: # die может произойти раньше
                        task.del_event(e)

    def on_perform(self, event):
        if self.is_hp_start:
            self._update_state(event)
            return
        self._clear_hp_tasks(event)
        time = event.time
        owner = self.owner
        hpst = HPState.copy_state(owner.hp_state)
        self.add_event(HPTaskEvent(server=owner.server, time=time, task=self, dhp=self.dhp, dps=self.dps))
        time = hpst.update(t=time, dhp=self.dhp, dps=self.dps)
        if time is not None:
             self.add_event(HPTaskEvent(server=owner.server, time=time, task=self, is_die=True))
        self.is_hp_start = True

    def on_start(self):
        HPTaskEvent(server=self.owner.server, task=self).post()


