# -*- coding: utf-8 -*-
from __future__ import print_function

import sys
import logging
log = logging.getLogger(__name__)

__ALL__ = ['Timer',]

if __name__ == '__main__':
    log = logging.getLogger()
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))


import os
import time
from datetime import datetime
from functools import wraps
import collections
from copy import copy


class SimpleTimer(object):
    STOP_SIGN = '!'
    RUN_SIGN = '...'

    def __init__(self, name=None, owner=None):
        self.name = name
        self.timestamp_start = None
        self.timestamp_stop = None
        self.owner = owner

    @property
    def time_start(self):
        return None if self.timestamp_start is None else datetime.fromtimestamp(self.timestamp_start)

    @property
    def time_stop(self):
        return None if self.timestamp_stop is None else datetime.fromtimestamp(self.timestamp_stop)

    def start(self, t=None):
        if t is None:
            t = time.time()
        self.timestamp_start = t
        return t

    def stop(self, t=None, owner_stop=True):
        owner = self.owner
        if owner_stop and owner is not None:
            return owner.stop(t)
        else:
            if t is None:
                t = time.time()
            self.timestamp_stop = t
            return t

    @property
    def is_started(self):
        return self.timestamp_start is not None

    @property
    def is_stopped(self):
        return self.timestamp_stop is not None

    @property
    def is_active(self):
        return self.is_started and not self.is_stopped

    @property
    def duration(self):
        if not self.is_started:
            return 0

        at_time = self.timestamp_stop or time.time()
        return at_time - self.timestamp_start

    def __repr__(self):
        return "<{name}:{self.duration:.3f}{runing_sign}>".format(
            name=self.name or self.__class__.__name__,
            self=self,
            runing_sign=seld.RUN_SIGN if self.is_active else self.STOP_SIGN,
        )


# todo: Progress tracking feature (estimate, stage, progress bar, stage comment)
class Timer(SimpleTimer):
    STOP_SIGN = '||'
    RUN_SIGN = '...'
    def __init__(
            self,
            logger=None,
            log_start='Timer {timer.name!r} started at {timer.time_start}',
            log_stop='Timer {timer.name!r} stopped at {timer.time_stop}. Duration is {timer.duration}s',
            log_level=logging.DEBUG,
            log_name=None,
            laps_store=False,
            **kw
        ):
        super(Timer, self).__init__()
        self.laps_store = laps_store
        self.log_level = log_level and logging._checkLevel(log_level) or logging.NOTSET
        _stream = None
        if logger is None or isinstance(logger, logging.Logger):
            self.logger = logger
        elif isinstance(logger, basestring) and logger in {'stderr', 'stdout'}:
            _stream = getattr(sys, logger)
        elif isinstance(getattr(logger, 'write', None), collections.Callable):
            _stream = logger
        else:
            raise ValueError(
                "Logger specification is wrong. {!r} given, but 'stderr', 'stdout' or Logger instance required."
                .format(logger)
            )
        if _stream:
            _handler = logging.StreamHandler(_stream)
            self.logger = logging.Logger(name=log_name, level=self.log_level)
            self.logger.addHandler(_handler)

        self.log_start = log_start
        self.log_stop = log_stop
        self.duration_sum = 0
        self.lap_count = 0
        self.lap_timer = None
        self.laps = []

        self._it_is_decorator = False
        self.__dict__.update(kw)

    def _log(self, message, *av, **kw):
        logger = self.logger
        if logger:
            logger.log(self.log_level, message, *av, **kw)

    def start(self, t=None, lap_name=None):
        # todo: lock to thread save support
        assert not self._it_is_decorator, "You can't start Timer instance used as decorator."
        assert self.lap_timer is None, "You can't start timer twice successively without stopping"
        lap_timer = self.lap_timer = SimpleTimer(
            name=lap_name or '{name}:lap#{self.lap_count}'.format(
                self=self,
                name=self.name or self.__class__.__name__,
            )
        )
        t = super(Timer, self).start(t)
        lap_timer.start(t)

        if self.log_start:
            self._log(self.log_start.format(timer=self))
        return t

    def stop(self, t=None):
        # todo: lock to thread save support
        lap_timer = self.lap_timer
        assert lap_timer is not None, "Timer is not running, you can't stop them"
        #t = super(Timer, self).stop(t)  # info: Будучи запущеным такой таймер уже не останавливается сам, только круги
        r = lap_timer.stop(t, owner_stop=False)
        self.lap_timer = None
        self.lap_count += 1
        self.duration_sum += lap_timer.duration
        # todo: min/max/avg calculate
        if self.laps_store:
            self.laps.append(lap_timer)

        if self.log_stop:
            self._log(self.log_stop.format(timer=self))
        return r

    @property
    def is_started(self):
        return self.lap_timer is not None

    @property
    def is_stopped(self):
        return self.lap_timer is None

    is_active = is_started

    @property
    def duration(self):
        lap_timer = self.lap_timer
        return self.duration_sum + (lap_timer.duration if lap_timer else 0)

    # todo: cumulative_duration of multiple start/stop laps

    def __enter__(self):
        self.start()
        return self.lap_timer

    def __exit__(self, ex_type, ex_value, traceback):
        self.stop()

    def __call__(self, func, name=None):
        self._it_is_decorator = True
        @wraps(func)
        def closure(*av, **kw):
            timer = copy(self)
            if name is not None:
                timer.name = name
            timer._it_is_decorator = False
            if timer.name is None:  # TODO: ##OPTIMIZE extract from closure
                # todo: call number store
                timer.name = 'FUNC {func.func_name} [{fn}:{func.func_code.co_firstlineno}]'.format(
                    func=func,
                    fn=os.path.basename(func.func_code.co_filename),
                )

            with timer:
                return func(*av, **kw)

        return closure


class T(Timer):
    def __init__(
            self,
            name=None,
            logger=sys.stdout,
            log_start=None,
            log_stop='Timer: {timer.duration:.4f}s - {timer.name}',
            log_level=logging.DEBUG,
            log_name=None,
            **kw
        ):
        super(T, self).__init__(
            name=name, logger=logger, log_start=log_start, log_stop=log_stop, log_level=log_level, log_name=log_name, **kw
        )


if __name__ == '__main__':
    import sys
    from time import sleep

    tm = Timer()
    for i in xrange(3):
        with tm as t:
            sleep(1)
        print('lap', tm.lap_count, tm, t)
        sleep(0.2)
    # # simple usage:
    # with Timer('simple', logger='stderr'):
    #     pass
    #
    # # normal usage:
    # tm = Timer(name='test', logger=log)
    # with tm as timer:
    #     task_size = 100000000 / 16
    #     for i in xrange(task_size):
    #         if i % (task_size / 10) == 0:
    #             print('{:.4f}'.format(timer.duration))

    # functions decoration usage:
    # @Timer(name='test2', logger=sys.stdout)
    # def test_routine2():
    #     print('test_routine2')

    # test_routine2()
    # test_routine2()