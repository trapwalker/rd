# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
from tasks import Task, TaskEvent
from state import State


class MotionTaskEvent(TaskEvent):
    def __init__(self, cc=None, turn=None, **kw):
        super(MotionTaskEvent, self).__init__(**kw)
        self.cc = cc
        self.turn = turn


class MotionTask(Task):
    def __init__(self, cc=None, turn=None, target_point=None, **kw):
        super(MotionTask, self).__init__(**kw)
        assert self.owner.state is not None
        self.cc = cc
        self.turn = turn
        self.target_point = target_point
        self.is_motion_start = False

    def _calc_keybord(self, event):
        time = event.time
        owner = self.owner
        st = State.copy_state(owner.state)
        while True:
            self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self, cc=self.cc, turn=self.turn))
            st.update(t=time, cc=self.cc, turn=self.turn)
            time = st.t_max
            if time is None:
                break

    def _calc_goto(self, event):
        pass

    def _update_state(self, event):
        owner = self.owner
        state = owner.state
        is_moving_before = state.is_moving
        state.update(t=event.time, cc=event.cc, turn=event.turn)
        is_moving_after = state.is_moving
        owner.on_update(event=event)
        if is_moving_before != is_moving_after:
            if is_moving_after:
                owner.on_start(event=event)
            else:
                owner.on_stop(event=event)

    def _clear_motion_tasks(self, event):
        owner = self.owner
        time = event.time
        tasks = owner.tasks[:]
        for task in tasks:
            if task != self and isinstance(task, MotionTask):
                events = task.events[:]
                for e in events:
                    if e.time > time:
                        task.del_event(e)

    def on_perform(self, event):
        if self.is_motion_start:
            self._update_state(event)
        else:
            self._clear_motion_tasks(event)
            if self.target_point:
                self._calc_goto(event)
            else:
                self._calc_keybord(event)
            self.is_motion_start = True

    def on_start(self):
        MotionTaskEvent(server=self.owner.server, task=self).send()