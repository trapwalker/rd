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
    def __init__(self):
        self.timestamp_start = None
        self.timestamp_stop = None

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

    def stop(self, t=None):
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


# todo: Progress tracking feature (estimate, stage, progress bar, stage comment)
class Timer(SimpleTimer):
    def __init__(
            self,
            name=None,
            logger=None,
            log_start='Timer {timer.name!r} started at {timer.time_start}',
            log_stop='Timer {timer.name!r} stopped at {timer.time_stop}. Duration is {timer.duration}s',
            log_level=logging.DEBUG,
            log_name=None,
            laps_store=False,
            **kw
        ):
        super(Timer, self).__init__()
        self.name = name
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
        self.summary_duration = None
        self.lap_timer = None

        self._it_is_decorator = False
        self.__dict__.update(kw)

    def _log(self, message, *av, **kw):
        logger = self.logger
        if logger:
            logger.log(self.log_level, message, *av, **kw)

    def start(self, t=None):
        assert not self._it_is_decorator, "You can't start Timer instance used as decorator."
        t = super(Timer, self).start(t)
        if self.log_start:
            self._log(self.log_start.format(timer=self))
        return t

    def stop(self, t=None):
        t = super(Timer, self).stop(t)
        if self.log_stop:
            self._log(self.log_stop.format(timer=self))
        return t

    # todo: cumulative_duration of multiple start/stop laps

    def __enter__(self):
        self.start()
        return self

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

    # simple usage:
    with Timer('simple', logger='stderr'):
        pass

    # normal usage:
    tm = Timer(name='test', logger=log)
    with tm as timer:
        task_size = 100000000 / 16
        for i in xrange(task_size):
            if i % (task_size / 10) == 0:
                print('{:.4f}'.format(timer.duration))

    # functions decoration usage:
    # @Timer(name='test2', logger=sys.stdout)
    # def test_routine2():
    #     print('test_routine2')

    # test_routine2()
    # test_routine2()