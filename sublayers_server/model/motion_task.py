# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
from tasks import Task, TaskEvent
from state import State, EPS
from vectors import Point
import math


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
            # начать двигаться по кругу и тормозить сразу же
            turn = -st._get_turn_sign(target_point)
            self.add_event(MotionTaskEvent(server=owner.server, time=time, task=self, cc=0.0, turn=turn))
            br_time = st.update(t=time, cc=0.0, turn=turn)
            log.debug('br_time=%s', br_time)
            '''
            Если мы кликнули внутрь радиуса, то нужно узнать сможем ли мы будучи в торможении достичь данной точки
            Для этого рассчитаем угол, на который мы должны довернуть своё текущее направление
            '''
            my_vect = Point.polar(1, st.fi0)
            t_vect = target_point - st.p0
            angle = abs(t_vect.angle_with(my_vect))
            log.debug('angle=%s', angle)
            if angle > EPS:
                # рассчитаем длину пути по кругу для достижения направления
                l_circle = angle * st.r(st.t0)
                # рассчитаем тормозной путь
                s_bracking = st.s(br_time)
                log.debug('l_circle=%s', l_circle)
                log.debug('s_bracking=%s', s_bracking)
                # если путь по кругу меньше, чем тормозной путь
                if l_circle < s_bracking:
                    # узнать как долго мы должны двигаться по кругу
                    t_circle = (- st.v0 + math.sqrt(st.v0 ** 2 + 2 * st.a * l_circle)) / st.a
                    log.debug('t_circle=%s', t_circle)
                    # закончить круг и остальную часть ехать прямо и тормозить
                    self.add_event(MotionTaskEvent(server=owner.server, time=time + t_circle, task=self, cc=0.0, turn=0.0))
                    # на всякий случай обновить время остановки
                    br_time = st.update(t=t_circle, cc=0.0, turn=0.0)
            if br_time:
                self.add_event(MotionTaskEvent(server=owner.server, time=br_time, task=self, turn=0.0))
                log.debug('time=%s', br_time)
            return

        # если мы стоим, то разогнаться до min (Vcc, 5 м/c)
        v_min = 5.0  #todo: обсудить куда вынести данный балансный параметр
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