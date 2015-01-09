# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
from tasks import Task, TaskEvent
from state import State, EPS


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
            time = st.update(t=time, cc=self.cc, turn=self.turn)
            if time is None:
                break

    def _calc_goto(self, event):
        log.debug('_calc_goto =============================================== start')

        time = event.time
        owner = self.owner
        target_point = self.target_point

        st = State.copy_state(owner.state)
        st.update(t=time, cc=self.cc)

        log.debug('time=%s', time)
        # Мы около цели, необходимо остановиться
        if st.p0.distance(target_point) < (2 * st.r(st.t0)):
            log.debug('111111111111111111111111111111111111111111111111111')
            log.debug('time=%s', time)
            turn = -st._get_turn_sign(target_point)
            self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self, cc=0.0, turn=turn))
            time = st.update(t=time, cc=0.0, turn=turn)
            if time:
                self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self, turn=0.0))
                log.debug('time=%s', time)
            return

        # если мы стоим, то разогнаться до min (Vcc, 5 м/c)
        v_min = 20.0  #todo: обсудить куда это вынести
        assert v_min < st.v_max
        temp_cc = min(self.cc, v_min / st.v_max) #определить минимальную скоростью
        if st.v0 < temp_cc * st.v_max:
            log.debug('222222222222222222222222222222222222222222222222222')
            log.debug('time=%s', time)
            turn = -st._get_turn_sign(target_point)
            self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self, cc=temp_cc, turn=turn))
            time = st.update(t=time, cc=temp_cc, turn=turn)
            log.debug('time=%s', time)

        # если мы не направлены в сторону цели, то повернуться к ней с постоянной скоростью
        st.update(t=time)
        turn_fi = st._get_turn_fi(target_point)
        if abs(turn_fi) > EPS:
            log.debug('333333333333333333333333333333333333333333333333333')
            log.debug('time=%s   in circle', time)
            temp_cc = st.v(time) / st.v_max
            turn = -st._get_turn_sign(target_point)
            self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self, cc=temp_cc, turn=turn))
            st.update(t=time, cc=temp_cc, turn=turn)
            time = st.t0 + turn_fi * st.r(st.t0) / st.v0
            log.debug('time=%s    out circle', time)

        # если мы направлены в сторону цели
        log.debug('444444444444444444444444444444444444444444444444444')
        log.debug('time=%s', time)
        st.update(t=time, turn=0.0)

        s = abs(target_point - st.p0)
        t1, t2, t3 = st._calc_time_segment(s, self.cc)
        log.debug(t1)
        log.debug(t2)
        log.debug(t3)
        if t1 != 0.0:
            self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self, cc=self.cc, turn=0.0))
            st.update(t=time, cc=self.cc, turn=0.0)
            time = st.t0 + t1
        if t2 != 0.0:
            self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self, cc=self.cc, turn=0.0))
            st.update(t=time, cc=self.cc, turn=0.0)
            time = st.t0 + t2
        if t3 != 0.0:
            self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self, cc=0.0, turn=0.0))
            time = st.update(t=time, cc=0.0, turn=0.0)
            assert time
            self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self))

        log.debug('_calc_goto =============================================== end')


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
        log.debug('======================================== on_perform time=%s', event.time)
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