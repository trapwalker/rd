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

    def on_perform(self, event):
        #todo: переделать правильно
        if not (self.is_worked and event.actual):
            return
        log.debug('=on_perform   event time = %s   ==========================', event.time)

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

    def on_start(self):
        log.debug('=Start start=========================================================================')
        owner = self.owner
        t_serv = owner.server.get_time()
        t_max = t_serv
        for task in owner.tasks:
            if task != self and isinstance(task, MotionTask):
                task.cancel(time=t_serv)

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

        log.debug('=Start end=========================================================================')


    def cancel(self, time):
        assert not self.is_cancelled and not self.is_done
        events = self.events[:]
        log.debug('cancel task ========== events_len = %s', len(events))
        for event in events:
            self.on_del_event(event, time)
            event.cancel()
        self.is_cancelled = True
        if self in self.owner.tasks:
            self.owner.tasks.remove(self)


    def on_del_event(self, event, time):
        # todo: обсудить эту попытку последовательных вызовов
        log.debug('on_del_event start ==========================================')
        log.debug('event.time = %s', event.time)
        log.debug('self._start_time = %s', time)

        if event.time < time:
            event.perform()

        log.debug('on_del_event end ==========================================')