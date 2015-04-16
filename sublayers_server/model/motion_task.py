# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.tasks import TaskPerformEvent, TaskSingleton
from sublayers_server.model.state import EPS
from copy import copy


class MotionTaskEvent(TaskPerformEvent):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.task.owner.classname}#{self.task.owner.id}> task={self.task.id}'
        '#alive={self.task.owner.is_alive}   #limbo=#{self.task.owner.limbo}>')

    def __init__(self, cc=None, turn=None, **kw):
        super(MotionTaskEvent, self).__init__(**kw)
        self.cc = cc
        self.turn = turn


class MotionTask(TaskSingleton):
    def __init__(self, cc=None, turn=None, target_point=None, comment=None, **kw):
        super(MotionTask, self).__init__(**kw)
        assert self.owner.state is not None
        self.cc = cc
        if cc is not None:
            self.owner.state.u_cc = cc
        self.turn = turn
        self.target_point = target_point
        self.comment = comment

    def _calc_keybord(self, start_time):
        time = start_time
        owner = self.owner
        st = copy(owner.state)
        st.update(t=time)
        if (self.cc * st.v(time)) < 0:
            MotionTaskEvent(time=time, task=self, cc=0.0, turn=self.turn, comment=self.comment).post()
            time = st.update(t=time, cc=0.0, turn=self.turn)
            assert time is not None
        while time is not None:
            MotionTaskEvent(time=time, task=self, cc=self.cc, turn=self.turn, comment=self.comment).post()
            time = st.update(t=time, cc=self.cc, turn=self.turn)
            if time is not None:
                assert time >= start_time

    def _calc_goto(self, start_time):

        log.debug('=============_calc_goto cc is %s', self.cc)

        time = start_time
        owner = self.owner
        target_point = self.target_point
        st = copy(owner.state)
        st.update(t=time)

        # Шаг 1: Синхронизация знаков сс и текущей скорости
        if (self.cc * st.v(time)) < 0:
            MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
            time = st.update(t=time, cc=0.0, turn=0.0)
            assert time is not None

        # Шаг 2: Установить желаемое сс
        if abs(self.cc - st.cc) > EPS:
            MotionTaskEvent(time=time, task=self, cc=self.cc, turn=0.0).post()
            time = st.update(t=time, cc=self.cc, turn=0.0)
            assert time is not None

        # Шаг 3: Повернуться к цели
        st.update(t=time)
        dist = st.p0.distance(target_point) - 2 * st.r(st.t0)
        if not (dist > EPS):  # если target_point слишком близко, то проехать некоторое расстояние вперед
            dist = 2.1 * st.r(st.t0)  # расстояние которое надо проехать
            MotionTaskEvent(time=time, task=self, cc=self.cc, turn=0.0).post()
            st.update(t=time, cc=self.cc, turn=0.0)
            time += abs(dist / st.v0)

        # Непосредственно поворот
        st.update(t=time)
        dist = st.p0.distance(target_point) - 2 * st.r(st.t0)
        if dist > EPS:  # если после последних апдейтов дистанция так же позволяет поворачивать
            turn_fi = st._get_turn_fi(target_point)
            if abs(turn_fi) > EPS:  # если мы не направлены в сторону цели, то повернуться к ней с постоянной скоростью
                turn = st._get_turn_sign(target_point)
                if st.v0 > 0:
                    turn = -turn
                MotionTaskEvent(time=time, task=self, cc=self.cc, turn=turn).post()
                st.update(t=time, cc=self.cc, turn=turn)
                time += abs(turn_fi * st.r(st.t0) / st.v0)

            # Шаг 4: Подъехать к цели
            st.update(t=time)
            dist = st.p0.distance(target_point)
            br_time = abs(st.v0 / st.a_braking)
            br_dist = abs(st.v0 * br_time + 0.5 * (br_time ** 2) * (st.a_braking if st.v0 >= 0 else -st.a_braking))

            if dist > br_dist:  # проехать некоторое расстояние вперед
                dist -= br_dist
                MotionTaskEvent(time=time, task=self, cc=self.cc, turn=0.0).post()
                st.update(t=time, cc=self.cc, turn=0.0)
                time += abs(dist / st.v0)

        # Замедление
        MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
        time = st.update(t=time, cc=0.0, turn=0.0)
        # Полная остановка
        MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
        time = st.update(t=time, cc=0.0, turn=0.0)
        assert time is None

    def _update_state(self, event):
        owner = self.owner
        state = owner.state
        is_moving_before = state.is_moving

        # работа с метрикой
        owner.stat_log.way(delta=state.s(t=event.time), time=event.time)

        state.update(t=event.time, cc=event.cc, turn=event.turn)
        is_moving_after = state.is_moving
        owner.on_update(event=event)
        if is_moving_before != is_moving_after:
            if is_moving_after:
                owner.on_start(event=event)
            else:
                owner.on_stop(event=event)

    def on_perform(self, event):
        super(MotionTask, self).on_perform(event=event)
        self._update_state(event)

    def on_start(self, event):
        owner = self.owner
        old_tp = None if owner.cur_motion_task is None else owner.cur_motion_task.target_point
        super(MotionTask, self).on_start(event=event)
        if old_tp:
            if (self.target_point is None) and (self.turn is None):
                self.target_point = old_tp
        if self.cc is None:
            self.cc = owner.state.u_cc
        assert self.cc is not None
        self.cc = min(abs(self.cc), abs(owner.params.get('p_cc').value)) * (1 if self.cc >= 0.0 else -1)
        if abs(self.cc) < EPS:
            self.target_point = None
            self.cc = 0.0
            owner.state.u_cc = 0.0

        if self.target_point:
            self._calc_goto(start_time=event.time)
        else:
            self._calc_keybord(start_time=event.time)
        owner.cur_motion_task = self

    def on_done(self, event=None):
        if self.owner.cur_motion_task == self:
            self.owner.cur_motion_task = None
        super(MotionTask, self).on_done(event=event)
