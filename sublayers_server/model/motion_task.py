# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.tasks import TaskPerformEvent, TaskSingleton
from sublayers_server.model.state import EPS
from copy import copy
from sublayers_server.model.vectors import Point
from math import sqrt, copysign


class MotionTaskEvent(TaskPerformEvent):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.task.owner.classname}#{self.task.owner.id}> task={self.task.id}'
        '#alive={self.task.owner.is_alive}   #limbo=#{self.task.owner.limbo}>')

    def __init__(self, cc=None, turn=None, stop_a=False, **kw):
        super(MotionTaskEvent, self).__init__(**kw)
        self.cc = cc
        self.turn = turn
        self.stop_a = stop_a


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

        # Шаг 0: Прекратить ускорение/замедление
        if st.t_max is not None:
            # log.debug('_calc_goto  cc=%s,  v0=%s', self.cc, st.v0)
            log.debug('============================== 0 %s %s', self.owner, time)
            old_v0 = st.v0
            cur_cc = copysign(st.v0 / st.get_max_v_by_curr_v(v=st.v0), st.v0)
            st.update(t=time, cc=cur_cc, stop_a=True)
            MotionTaskEvent(time=time, task=self, cc=cur_cc, turn=0.0, stop_a=True).post()
            assert st.t_max is None, 'st.t_max={:6f} t0={:.6f} cur_cc={:.6f}  old_v0={} new_v0={}'.format(st.t_max, st.t0, cur_cc, old_v0, st.v0)


        # Шаг 1: Синхронизация знаков сс и текущей скорости
        if (self.cc * st.v(time)) < 0:
            log.debug('============================== 1 %s %s', self.owner, time)
            MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
            time = st.update(t=time, cc=0.0, turn=0.0)
            assert time is not None

        # Шаг 2: Если скорость 0 то необходимо разогнаться
        if abs(st.v(t=time)) < EPS:
            min_cc = min(abs(self.cc), abs(owner.params.get('p_cc').original * 0.1)) * (1 if self.cc >= 0.0 else -1)
            log.debug('============================== 2 %s %s', self.owner, time)
            MotionTaskEvent(time=time, task=self, cc=min_cc, turn=0.0).post()
            time = st.update(t=time, cc=min_cc, turn=0.0)
            assert time is not None

        # Шаг 3: Замедлиться при необходимости
        v = st.v(t=time)
        v0 = st.v0
        v_max = st.get_max_v_by_cc(cc=self.cc)
        dv = v_max * abs(self.cc) - v0
        if abs(dv) > EPS:
        # if (abs(v) - abs(self.cc * st.get_max_v_by_cc(self.cc))) > EPS:
            log.debug('============================== 3 %s %s', self.owner, time)
            temp_t = time
            MotionTaskEvent(time=time, task=self, cc=self.cc, turn=0.0).post()
            time = st.update(t=time, cc=self.cc, turn=0.0)
            if time is None:
                time = temp_t
            # temp_t_max = None
            # if st.a != 0.0:
            #     temp_t_max = temp_t + dv / st.a
            # # todo: кажется, здесь может не быть ассерта, либо нужно более правильную проверку для IF'а писать, иначе в стейте и здесь считается не одинаково
            # assert time is not None, 'time={} old_time={} t_max_calc={} cc={}, v={} v0={} v_max={} dv={}'.format(
            #     time, temp_t, temp_t_max, self.cc, v, v0, v_max, dv)

        # Шаг 4: Расчет поворота
        st.update(t=time)
        assert st.t_max is None, 't_max={:.6f} t0={:.6f}  v0={}  a={}'.format(st.t_max, st.t0, st.v0, st.a)
        if st._need_turn(target_point=target_point):  # если мы не направлены в сторону
            log.debug('============================== 4 %s %s', self.owner, time)
            dist = st.p0.distance(target_point) - 2 * st.r(st.t0)
            # Если target_point слишком близко, то проехать некоторое расстояние вперед
            if dist <= 0.0:
                v_dir = Point.polar(r=1, fi=st.fi0)
                min_dist = (st.p0 + v_dir.scale(Point.scalar_mul(v_dir, (target_point - st.p0)))).distance(target_point)
                target_v = sqrt((max(min_dist / 2.0, st.r_min) - st.r_min) * st.ac_max)
                if target_v < EPS:
                    target_v = min(5.0, st.get_max_v_by_cc(self.cc) * self.cc)
                target_cc = target_v / st.get_max_v_by_cc(self.cc)

                if abs(target_v - st.v(t=time)) > EPS:
                    log.debug('============================== 4.1 %s %s', self.owner, time)
                    MotionTaskEvent(time=time, task=self, cc=target_cc, turn=0.0).post()
                    time = st.update(t=time, cc=target_cc, turn=0.0)

                # Если мы близко, то проехать 2 радиуса
                st.update(t=time)
                dist = st.p0.distance(target_point) - 2 * st.r(st.t0)
                if not (dist > EPS):
                    dist = 4.1 * st.r(st.t0)  # расстояние которое надо проехать
                    log.debug('============================== 4.2 %s %s', self.owner, time)
                    MotionTaskEvent(time=time, task=self, turn=0.0).post()
                    st.update(t=time, turn=0.0)
                    time += abs(dist / st.v0)
            # Непосредственно поворот
            st.update(t=time)
            turn_fi = st._get_turn_fi(target_point)
            turn = st._get_turn_sign(target_point)
            if st.v0 > 0:
                turn = -turn
            log.debug('============================== 4.3 %s %s', self.owner, time)
            MotionTaskEvent(time=time, task=self, turn=turn).post()
            st.update(t=time, turn=turn)
            assert st.t_max is None, 't_max={}  turn_fi={}  turn={}'.format(st.t_max, turn_fi, turn)
            time += abs(turn_fi * st.r(st.t0) / st.v0)

        # Шаг 5: Доехать до цели
        st.update(t=time)
        dist = st.p0.distance(target_point)
        a_time, m_time, b_time = st._calc_time_segment(s=dist, cc=self.cc)
        if a_time > 0.0:
            log.debug('============================== 5.1 %s %s', self.owner, time)
            MotionTaskEvent(time=time, task=self, cc=self.cc, turn=0.0).post()
            upd_time = st.update(t=time, cc=self.cc, turn=0.0)
            time = min(upd_time, time + a_time)
        if m_time > 0.0:
            log.debug('============================== 5.2 %s %s', self.owner, time)
            MotionTaskEvent(time=time, task=self, turn=0.0).post()
            st.update(t=time, turn=0.0)
            time += m_time
        # Замедление
        log.debug('============================== 6 %s %s', self.owner, time)
        MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
        time = st.update(t=time, cc=0.0, turn=0.0)
        # Полная остановка
        log.debug('============================== 7 %s %s', self.owner, time)
        MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
        time = st.update(t=time, cc=0.0, turn=0.0)
        assert time is None

    def _update_state(self, event):
        owner = self.owner
        state = owner.state
        is_moving_before = state.is_moving

        # работа с метрикой
        s = state.s(t=event.time)
        owner.example.set_way(dvalue=s)
        if owner.example.k_way_exp is None:
            log.warning('Exp by riding rate is None: owner.example.k_way_exp')
        owner.example.set_exp(dvalue=s * (owner.example.k_way_exp or 0))

        state.update(t=event.time, cc=event.cc, turn=event.turn, stop_a=event.stop_a)
        is_moving_after = state.is_moving
        owner.on_update(event=event)
        if is_moving_before != is_moving_after:
            if is_moving_after:
                owner.on_start(event=event)
            else:
                owner.on_stop(event=event)

    def on_perform(self, event):
        super(MotionTask, self).on_perform(event=event)
        try:
            self._update_state(event)
        except:
            log.debug('Goto error for %s %s', self.owner, event.time)
            self.owner.server.stop()

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
            try:
                self._calc_goto(start_time=event.time)
            except Exception as e:
                log.debug('_calc_goto error for %s %s', self.owner, event.time)
                log.debug(e)
                log.exception(e)
                self.owner.server.stop()
        else:
            self._calc_keybord(start_time=event.time)
        owner.cur_motion_task = self

    def on_done(self, event=None):
        if self.owner.cur_motion_task == self:
            self.owner.cur_motion_task = None
        super(MotionTask, self).on_done(event=event)
