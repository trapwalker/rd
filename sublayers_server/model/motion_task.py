# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.tasks import TaskPerformEvent, TaskSingleton
from sublayers_server.model.state import EPS
from copy import copy
from sublayers_server.model.vectors import Point
from math import sqrt, copysign
from sublayers_server.model.state import MotionState


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
        self.debug_comments = []

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
        self.debug_comments.append('start _calc_goto {} {}'.format(self.owner, time))
        owner = self.owner
        target_point = self.target_point
        st = copy(owner.state)
        st.update(t=time)

        # Шаг 0: Прекратить ускорение/замедление
        if st.t_max is not None:
            self.debug_comments.append('0 {} {} t_max={}'.format(owner, time, st.t_max))
            old_v0 = st.v0
            cur_cc = copysign(st.v0 / st.get_max_v_by_curr_v(v=st.v0), st.v0)
            st.update(t=time, cc=cur_cc, stop_a=True)
            MotionTaskEvent(time=time, task=self, cc=cur_cc, turn=0.0, stop_a=True).post()
            assert st.t_max is None, 'st.t_max={:6f} t0={:.6f} cur_cc={:.6f}  old_v0={} new_v0={}'.format(st.t_max, st.t0, cur_cc, old_v0, st.v0)

        # Шаг 1: Синхронизация знаков сс и текущей скорости
        if (self.cc * st.v(time)) < 0:
            self.debug_comments.append('1 {} {} cc={}'.format(owner, time, self.cc))
            MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
            time = st.update(t=time, cc=0.0, turn=0.0)
            assert time is not None

        # Шаг 2: Если скорость 0 то необходимо разогнаться
        if abs(st.v(t=time)) < EPS:
            min_cc = min(abs(self.cc), abs(owner.params.get('p_cc').original * 0.1)) * (1 if self.cc >= 0.0 else -1)
            self.debug_comments.append('2 {} {} min_cc={}'.format(owner, time, min_cc))
            MotionTaskEvent(time=time, task=self, cc=min_cc, turn=0.0).post()
            time = st.update(t=time, cc=min_cc, turn=0.0)
            assert time is not None

        # Шаг 3: Достигнуть целевого сс
        __target_v = st.get_max_v_by_cc(cc=self.cc) * abs(self.cc)
        if abs(__target_v - st.v0) > EPS:
            self.debug_comments.append('3 {} {}  st.v0={} __target_v={}'.format(owner, time, st.v0, __target_v))
            temp_t = time
            MotionTaskEvent(time=time, task=self, cc=self.cc, turn=0.0).post()
            time = st.update(t=time, cc=self.cc, turn=0.0)
            if time is None:
                self.debug_comments.append('3.1 {} {} '.format(owner, time))
                time = temp_t

        # Шаг 4: Расчет поворота
        st.update(t=time)
        assert st.t_max is None, 't_max={:.6f} t0={:.6f}  v0={}  a={}'.format(st.t_max, st.t0, st.v0, st.a)
        if st._need_turn(target_point=target_point):  # если мы не направлены в сторону
            dist = st.p0.distance(target_point) - 2 * st.r(st.t0)
            self.debug_comments.append('4 {} {} dist={}'.format(owner, time, dist))
            # Если target_point слишком близко, то проехать некоторое расстояние вперед
            if dist <= 0.0:
                v_dir = Point.polar(r=1, fi=st.fi0)
                min_dist = (st.p0 + v_dir.scale(Point.scalar_mul(v_dir, (target_point - st.p0)))).distance(target_point)
                target_v = sqrt((max(min_dist / 2.0, st.r_min) - st.r_min) * st.ac_max)
                if target_v < EPS:
                    target_v = min(5.0, st.get_max_v_by_cc(self.cc) * self.cc)
                target_cc = target_v / st.get_max_v_by_cc(self.cc)
                self.debug_comments.append('4.0 {} {} target_v={} target_cc={} min_dist={}'.format(owner, time, target_v, target_cc, min_dist))
                if abs(target_v - st.v(t=time)) > EPS:
                    self.debug_comments.append('4.1 {} {}  v0={}'.format(owner, time, st.v(t=time)))
                    temp_t = time
                    MotionTaskEvent(time=time, task=self, cc=target_cc, turn=0.0).post()
                    time = st.update(t=time, cc=target_cc, turn=0.0)
                    if time is None:
                        self.debug_comments.append('4.1.1 {} {}'.format(owner, time))
                        time = temp_t

                # Если мы близко, то проехать 2 радиуса
                st.update(t=time)
                dist = st.p0.distance(target_point) - 2 * st.r(st.t0)
                if not (dist > EPS):
                    dist = 4.1 * st.r(st.t0)  # расстояние которое надо проехать
                    self.debug_comments.append('4.2 {} {}  dist={}'.format(owner, time, dist))
                    MotionTaskEvent(time=time, task=self, turn=0.0).post()
                    st.update(t=time, turn=0.0)
                    time += abs(dist / st.v0)
            # Непосредственно поворот
            st.update(t=time)
            turn_fi = st._get_turn_fi(target_point)
            turn = st._get_turn_sign(target_point)
            if st.v0 > 0:
                turn = -turn
            # log.debug('============================== 4.3 %s %s', self.owner, time)
            self.debug_comments.append('4.3 {} {}'.format(owner, time))
            MotionTaskEvent(time=time, task=self, turn=turn).post()
            st.update(t=time, turn=turn)
            assert st.t_max is None, 't_max={}  turn_fi={}  turn={}'.format(st.t_max, turn_fi, turn)
            time += abs(turn_fi * st.r(st.t0) / st.v0)

        # Шаг 5: Доехать до цели
        st.update(t=time)
        dist = st.p0.distance(target_point)
        a_time, m_time, b_time = st._calc_time_segment(s=dist, cc=self.cc)
        if a_time > 0.0:
            # log.debug('============================== 5.1 %s %s', self.owner, time)
            self.debug_comments.append('5.1 {} {}'.format(owner, time))
            MotionTaskEvent(time=time, task=self, cc=self.cc, turn=0.0).post()
            upd_time = st.update(t=time, cc=self.cc, turn=0.0)
            time = min(upd_time, time + a_time)
        if m_time > 0.0:
            # log.debug('============================== 5.2 %s %s', self.owner, time)
            self.debug_comments.append('5.2 {} {}'.format(owner, time))
            MotionTaskEvent(time=time, task=self, turn=0.0).post()
            st.update(t=time, turn=0.0)
            time += m_time
        # Замедление
        # log.debug('============================== 6 %s %s', self.owner, time)
        self.debug_comments.append('6 {} {}'.format(owner, time))
        MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
        time = st.update(t=time, cc=0.0, turn=0.0)
        # Полная остановка
        # log.debug('============================== 7 %s %s', self.owner, time)
        self.debug_comments.append('7 {} {}'.format(owner, time))
        MotionTaskEvent(time=time, task=self, cc=0.0, turn=0.0).post()
        time = st.update(t=time, cc=0.0, turn=0.0)
        assert time is None

    def _update_state(self, event, time=None, cc=None, turn=None, stop_a=None):
        owner = self.owner
        state = owner.state
        is_moving_before = state.is_moving

        cc = cc if cc is not None else event and getattr(event, "cc", None)
        time = time if time is not None else event and getattr(event, "time", None)
        turn = turn if turn is not None else event and getattr(event, "turn", None)
        stop_a = stop_a if stop_a is not None else event and getattr(event, "stop_a", None)

        # assert cc is not None and time is not None and turn is not None and stop_a is not None, "{cc}, {time}, {turn}, {stop_a}".format(**locals())

        # работа с метрикой
        way = state.way(t=time)
        if owner.example and getattr(owner.example, "set_way", None):
            owner.example.set_way(dvalue=way)
            if owner.example.k_way_exp is None:
                log.warning('Exp by riding rate is None: owner.example.k_way_exp')
            owner.example.set_exp(dvalue=way * (owner.example.k_way_exp or 0), time=time, model_agent=owner.main_agent)

        state.update(t=time, cc=cc, turn=turn, stop_a=stop_a)
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
            if self.target_point:
                self.tact(event)
            else:
                self._update_state(event)
        except Exception as e:
            self.done()
            last_owner_position = self.owner.state.p0
            log.debug('on_perform_update_state error for %s %s cc=%s turn=%s tp=%s', self.owner, event.time, self.cc, self.turn, self.target_point)
            for line in self.debug_comments:
                log.debug(line)
            log.exception(e)
            if self.owner.main_agent:
                self.owner.main_agent.log.info('on_perform_update_state error for {} {} cc={} turn={} tp={}'.format(self.owner, event.time, self.cc, self.turn, self.target_point))
            self.owner.state = state = MotionState(t=event.time, **self.owner.init_state_params())
            state.p0 = last_owner_position
            if state.errors:
                log.warning('!!! State ERROR {where}:\n    {errors}'.format(
                    where=self.owner and self.owner.example,
                    errors='\n    '.join(state.errors),
                ))
            self.owner.set_motion(cc=0.0, time=event.time)
            # self.owner.server.stop()

    def tact(self, event):
        EPSDIST = 15
        time = event.time
        owner = self.owner
        target_point = self.target_point
        st = copy(owner.state)
        st.update(t=time)
        cur_cc = copysign(st.v0 / st.get_max_v_by_curr_v(v=st.v0), st.v0)

        def breaking_s_with_curve_by_v(st, v):
            r_min = (v ** 2) / st.ac_max + st.r_min
            breaking_time = abs(v / st.a_braking)
            breaking_s = abs(v) * breaking_time + 0.5 * st.a_braking * (breaking_time ** 2)
            return r_min + breaking_s

        def breaking_t_by_v(st, v):
            return abs(v / st.a_braking)

        def breaking_s_by_v(st, v):
            breaking_time = breaking_t_by_v(st, v)
            return abs(v) * breaking_time + 0.5 * st.a_braking * (breaking_time ** 2)

        # todo: make method  _tact_action
        def tact_action(event, st, cc, turn, next_time=None, stop_a=False):
            time = event.time
            next_time = next_time or time + 1.0
            state_time = st.update(t=time, cc=cc, turn=turn)
            t = min(state_time, next_time) if state_time is not None else next_time
            self._update_state(event=event, time=time, cc=cc, turn=turn, stop_a=stop_a)
            TaskPerformEvent(time=t, task=self).post()

        ############ Вариант 1
        dist = st.p0.distance(target_point)
        break_dist = breaking_s_by_v(st=st, v=st.v0)
        ddist = dist - break_dist

        # Синхронизация знаков сс и текущей скорости
        if self.cc * st.v0 < 0:
            tact_action(event=event, st=st, cc=0.0, turn=0.0)
            return

        # Минимальная приемлимая скорость
        min_acceptable_cc = copysign(min(0.05, abs(self.cc)), self.cc)

        need_turn = st._need_turn(target_point, epsilon=0.2)
        turn = st._get_turn_sign(target_point) if need_turn else 0.0
        if st.v0 > 0:
            turn = -turn

        # Остановка
        # print 'dist={dist:.4f}, break_dist={break_dist:.4f}, curr_cc={cur_cc:.4f}, min_acceptable_cc={min_acceptable_cc:.4f}'.format(**locals())
        if abs(cur_cc) <= EPS and abs(ddist) <= EPSDIST:  # Вызвать полную остановку
            self._update_state(event=event, time=time, cc=0.0, turn=0.0, stop_a=False)
            return

        if abs(cur_cc - min_acceptable_cc) <= EPS and abs(ddist) <= EPSDIST:  # Вызвать полную остановку
            time_stop = breaking_t_by_v(st, st.v0)
            tact_action(event=event, st=st, cc=0.0, turn=0.0, next_time=time + time_stop)
            return

        if not need_turn:
            if abs(ddist) < EPSDIST:
                time_stop = breaking_t_by_v(st, st.v0)
                tact_action(event=event, st=st, cc=0.0, turn=0.0, next_time=time + time_stop)
            elif ddist < 0.0:
                tact_action(event=event, st=st, cc=min_acceptable_cc, turn=0.0)
            elif ddist > 2 * break_dist:
                next_time = event.time + 1
                if abs(abs(cur_cc) - abs(self.cc)) < EPS:
                    next_time = event.time + ddist / abs(st.v0)
                tact_action(event=event, st=st, cc=self.cc, turn=0.0, next_time=next_time)
            else:
                next_time = event.time + min(ddist / abs(st.v0), 1)
                tact_action(event=event, st=st, cc=cur_cc, turn=0.0, next_time=next_time)
        else:
            # Если нужен поворот, то сначала считаем насколько мы далеко от точки
            curv_radius = ((st.v0 ** 2) / st.ac_max + st.r_min) * 2.0
            if curv_radius > dist:  # Притормаживаем в повороте
                tact_action(event=event, st=st, cc=min(min_acceptable_cc, self.cc), turn=turn, next_time=time + 0.5)
            else:  # Рассчёт угла
                turn_fi = st._get_turn_fi(target_point)
                dt = 0.5
                st.update(t=time, cc=None, turn=turn, stop_a=True)
                angle_v = abs((st.fi(time + 0.05) - st.fi0) / 0.05)
                if angle_v > EPS:
                    dt = min(dt, abs(turn_fi / angle_v))

                if abs(turn_fi) > 1.57:  # Если больше 90 градусов, то пытаемся развернуться с ускорением  dt секунд
                    if dist < breaking_s_with_curve_by_v(st, st.v0):
                        disired_cc = min(min_acceptable_cc, self.cc)
                    else:
                        disired_cc = max(self.cc, min_acceptable_cc)
                    tact_action(event=event, st=st, cc=disired_cc, turn=turn, next_time=time + dt)
                else:  # Доворот
                    if abs(cur_cc) <= EPS:  # Если стоим, то поворачиваем в разгоне
                        disired_cc = max(self.cc, min_acceptable_cc) if abs(dist) > 2 * EPSDIST else min_acceptable_cc
                        tact_action(event=event, st=st, cc=disired_cc, turn=turn, next_time=time + dt)
                    else:  # Если едем, то доворачиваем на текущем CC
                        t = time + abs(turn_fi * st.r(st.t0) / st.v0)
                        tact_action(event=event, st=st, cc=cur_cc, turn=turn, next_time=t, stop_a=True)
        return


        ############ Конец варианта 1






        # Рассчитать от текущей скорости точку остановки
        dist = st.p0.distance(target_point)
        if abs(st.v0) <= EPS:  # Если мы стоим
            if dist <= EPSDIST:  # Вызвать полную остановку
                # tact_action(event=event, st=st, cc=0.0, turn=0.0)
                self._update_state(event=event, time=time, cc=0.0, turn=0.0, stop_a=False)
                return

        # Параметры поворота
        need_turn = st._need_turn(target_point)
        turn = st._get_turn_sign(target_point) if need_turn else 0.0
        if st.v0 > 0:
            turn = -turn

        # Минимальная приемлимая скорость
        min_acceptable_cc = copysign(min(0.05, abs(self.cc)), self.cc)
        min_acceptable_v = st.get_max_v_by_cc(min_acceptable_cc) * min_acceptable_cc

        if not need_turn:
            break_dist = breaking_s_by_v(st=st, v=st.v0)
            ddist = dist - break_dist
            if abs(ddist) < EPSDIST:
                tact_action(event=event, st=st, cc=0.0, turn=0.0)
                return
            elif ddist < 0.0:
                tact_action(event=event, st=st, cc=min_acceptable_cc, turn=0.0)
                return
            else:
                tact_action(event=event, st=st, cc=self.cc, turn=0.0)
                return

        # Параметры поворота
        need_turn = st._need_turn(target_point, epsilon=0.3)
        turn = st._get_turn_sign(target_point) if need_turn else 0.0
        if st.v0 > 0:
            turn = -turn

        # Если мы находимся внутри минимального круга разворота, то проехать прямо
        if dist < breaking_s_with_curve_by_v(st, min_acceptable_v):
            tact_action(event=event, st=st, cc=min_acceptable_cc, turn=0.0)
            print 'inside!!!'
            return

        # Рассчёт понятия "близко"
        if dist < breaking_s_with_curve_by_v(st, st.v0):
            if not need_turn:
                tact_action(event=event, st=st, cc=0.0, turn=turn)
                print 'PROSTO TORMOZIT!'
            else:
                if abs(min_acceptable_cc - cur_cc) < EPS:  # поворот без ускорения
                    turn_fi = st._get_turn_fi(target_point)
                    t = time + abs(turn_fi * st.r(st.t0) / st.v0)
                    tact_action(event=event, st=st, cc=min_acceptable_cc, turn=turn, next_time=t)
                    print 'PROSTO RAZVOROT!'
                    return
                tact_action(event=event, st=st, cc=min_acceptable_cc, turn=turn, next_time=time + 0.5)
                print 'RAZVOROT SPIRAL!'
            return

        # Если поворачивает без ускорения, то поворачивать нужное кол-во времени
        if need_turn and abs(self.cc - cur_cc) < EPS:
            turn_fi = st._get_turn_fi(target_point)
            t = time + abs(turn_fi * st.r(st.t0) / st.v0)
            tact_action(event=event, st=st, cc=self.cc, turn=turn, next_time=t)
            return

        tact_action(event=event, st=st, cc=self.cc, turn=turn)


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
                # self._calc_goto(start_time=event.time)
                # self.tact(event, false_update)
                TaskPerformEvent(time=event.time, task=self).post()
            except Exception as e:
                self.done()
                owner_position = self.owner.position(time=event.time)
                log.debug('_calc_goto error for %s %s cc=%s turn=%s tp=%s', self.owner, event.time, self.cc, self.turn, self.target_point)
                for line in self.debug_comments:
                    log.debug(line)
                log.exception(e)
                if owner.main_agent:
                    owner.main_agent.log.info('_calc_goto error for {} {} cc={} turn={} tp={}'.format(self.owner, event.time, self.cc, self.turn, self.target_point))
                self.owner.state = state = MotionState(t=event.time, **self.owner.init_state_params())
                self.owner.state.p0 = owner_position
                self.owner.set_motion(cc=0.0, time=event.time)
                if state.errors:
                    log.warning('!!! State ERROR {where}:\n    {errors}'.format(
                        where=self.owner and self.owner.example,
                        errors='\n    '.join(state.errors),
                    ))
                # self.owner.server.stop()
        else:
            self._calc_keybord(start_time=event.time)
        owner.cur_motion_task = self

    def on_done(self, event=None):
        if self.owner.cur_motion_task == self:
            self.owner.cur_motion_task = None
        super(MotionTask, self).on_done(event=event)
