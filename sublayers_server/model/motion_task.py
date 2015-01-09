# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
from tasks import Task, TaskEvent
from events import Event, Update
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

    def on_perform(self, event):
        log.debug('========================MotionTask.on_perform event time = %s', event.time)

        if self.is_motion_start:
            #if not (self.is_worked and event.actual):
            #    return
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
            if len(self.events) == 0:
                self.done()
        else:
            log.debug('Start start=========================================================================')
            t_serv = event.time
            t_max = t_serv
            owner = self.owner
            tasks = owner.tasks[:]
            for task in tasks:
                if task != self and isinstance(task, MotionTask):
                    events = task.events[:]
                    log.debug('cancel task ========== events_len = %s', len(events))
                    for event in events:
                        log.debug('on_del_event start ==========================================')
                        log.debug('event.time = %s', event.time)
                        log.debug('self._start_time = %s', t_serv)
                        if event.time > t_serv:
                            task.del_event(event)

            st = State.copy_state(owner.state)
            log.debug('=Start t_max=%s', st.t_max)
            log.debug('=Start t_serv=%s', t_serv)
            while True:
                self.add_event(MotionTaskEvent(server=owner.server, time=t_max, task=self, cc=self.cc, turn=self.turn))
                st.update(t=t_max, cc=self.cc, turn=self.turn)
                t_max = st.t_max
                if t_max is None:
                    break
                log.debug('=Start in while t_max=%s', t_max)
            log.debug('Start end=========================================================================')
            self.is_motion_start = True

    def on_start(self):
        owner = self.owner
        t_serv = owner.server.get_time()
        MotionTaskEvent(server=owner.server, time=t_serv, task=self).send()