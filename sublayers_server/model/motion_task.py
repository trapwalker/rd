# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.tasks import TaskPerformEvent, TaskSingleton
from sublayers_server.model.state import EPS
from copy import copy
from sublayers_server.model.vectors import Point
from math import sqrt


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
            assert (time is None) or (time >= start_time)

    def _calc_goto(self, start_time):
        time = start_time
        owner = self.owner
        target_point = self.target_point
        st = copy(owner.state)
        st.update(t=time)

        log.debug('============================== start last_time= %s', st.t_max)
        # Шаг 0: Прекратить ускорение/замедление
        if st.t_max is not None:
            cur_cc = st.v0 / st.get_max_v_by_cc(cc=self.cc)
            st.update(t=time, cc=cur_cc)
            MotionTaskEvent(time=time, task=self, cc=cur_cc, turn=0.0).post()
        log.debug('============================== 0 last_time= %s', st.t_max)

        # Шаг 1: Синхронизация знаков сс и текущей скорости
        if (self.cc * st.v(time)) < 0:
            log.debug('============================== 1')
            MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
            time = st.update(t=time, cc=0.0, turn=0.0)
            assert time is not None

        # Шаг 2: Если скорость 0 то необходимо разогнаться
        if abs(st.v(t=time)) < EPS:
            log.debug('============================== 2')
            min_cc = min(abs(self.cc), abs(owner.params.get('p_cc').original * 0.1)) * (1 if self.cc >= 0.0 else -1)
            MotionTaskEvent(time=time, task=self, cc=min_cc, turn=0.0).post()
            time = st.update(t=time, cc=min_cc, turn=0.0)
            assert time is not None

        # Шаг 3: Замедлиться при необходимости
        if (abs(st.v(t=time)) - abs(self.cc * st.get_max_v_by_cc(self.cc))) > EPS:
            log.debug('============================== 3')
            MotionTaskEvent(time=time, task=self, cc=self.cc, turn=0.0).post()
            time = st.update(t=time, cc=self.cc, turn=0.0)
            assert time is not None

        # Шаг 4: Расчет поворота
        st.update(t=time)
        #turn_fi = st._get_turn_fi(target_point)
        #if abs(turn_fi) > EPS:  # если мы не направлены в сторону
        if st._need_turn(target_point=target_point):  # если мы не направлены в сторону
            log.debug('============================== 4')
            dist = st.p0.distance(target_point) - 2 * st.r(st.t0)
            # Если target_point слишком близко, то проехать некоторое расстояние вперед
            if not (dist > EPS):
                log.debug('============================== 41')
                v_dir = Point.polar(r=1, fi=st.fi0)
                v_t = (target_point - st.p0)
                min_dist = (st.p0 + v_dir * (v_dir * v_t)).distance(target_point)
                log.debug('============================== min_dist=%s', min_dist)
                min_r = max(min_dist / 2.0, st.r_min)
                target_v = sqrt((min_r - st.r_min) * st.ac_max)
                if target_v < EPS:
                    log.debug('============================== 411')
                    target_v = 5.0  # todo: вычеслить
                target_cc = target_v / st.get_max_v_by_cc(self.cc)
                MotionTaskEvent(time=time, task=self, cc=target_cc, turn=0.0).post()
                time = st.update(t=time, cc=target_cc, turn=0.0)

                # Если мы близко, то проехать 2 радиуса
                st.update(t=time)
                dist = st.p0.distance(target_point) - 2 * st.r(st.t0)
                if not (dist > EPS):
                    log.debug('============================== 42')
                    dist = 2 * st.r(st.t0)  # расстояние которое надо проехать
                    MotionTaskEvent(time=time, task=self, turn=0.0).post()
                    st.update(t=time, turn=0.0)
                    time += abs(dist / st.v0)
                # Вроде работало, но не красиво
                # log.debug('============================== 5')
                # dist = 4 * st.r(st.t0)  # расстояние которое надо проехать
                # MotionTaskEvent(time=time, task=self, turn=0.0).post()
                # st.update(t=time, turn=0.0)
                # time += abs(dist / st.v0)
            # Непосредственно поворот
            log.debug('============================== 43')
            st.update(t=time)
            turn_fi = st._get_turn_fi(target_point)
            turn = st._get_turn_sign(target_point)
            if st.v0 > 0:
                turn = -turn
            MotionTaskEvent(time=time, task=self, turn=turn).post()
            st.update(t=time, turn=turn)
            time += abs(turn_fi * st.r(st.t0) / st.v0)

        # Шаг 5: Доехать до цели
        log.debug('============================== 6')
        st.update(t=time)
        dist = st.p0.distance(target_point)
        a_time, m_time, b_time = st._calc_time_segment(s=dist, cc=self.cc)
        if a_time > 0.0:
            MotionTaskEvent(time=time, task=self, cc=self.cc, turn=0.0).post()
            upd_time = st.update(t=time, cc=self.cc, turn=0.0)
            time = min(upd_time, time + a_time)
        if m_time > 0.0:
            MotionTaskEvent(time=time, task=self, turn=0.0).post()
            st.update(t=time, turn=0.0)
            time += m_time
        # Замедление
        MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
        time = st.update(t=time, cc=0.0, turn=0.0)
        # Полная остановка
        MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
        time = st.update(t=time, cc=0.0, turn=0.0)
        assert time is None
        log.debug('============================== end')

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
