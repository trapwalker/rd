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
from copy import copy


# todo: Progress tracking feature (estimate, stage, progress bar, stage comment)
class Timer(object):
    def __init__(
            self,
            name=None,
            logger=log,
            log_start='Timer {timer.name!r} started at {timer.time_start}',
            log_stop='Timer {timer.name!r} stopped at {timer.time_stop}. Duration is {timer.duration}s',
            **kw
        ):
        self.name = name
        self.logger = logger
        self.log_start = log_start
        self.log_stop = log_stop
        self.timestamp_start = None
        self.timestamp_stop = None
        self._it_is_decorator = False
        self.__dict__.update(kw)

    @property
    def time_start(self):
        return None if self.timestamp_start is None else datetime.fromtimestamp(self.timestamp_start)
        
    @property
    def time_stop(self):
        return None if self.timestamp_stop is None else datetime.fromtimestamp(self.timestamp_stop)

    def start(self):
        assert not self._it_is_decorator, "You can't start Timer instance used as decorator."
        t = time.time()
        self.timestamp_start = t
        if self.logger and self.log_start:
            self.logger.debug(self.log_start.format(timer=self))
        return t

    def stop(self):
        t = time.time()
        self.timestamp_stop = t
        if self.logger and self.log_stop:
            self.logger.debug(self.log_stop.format(timer=self))
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

    # todo: cumulative_duration of multiple start/stop laps

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, ex_type, ex_value, traceback):
        self.stop()

    def __call__(self, func):
        self._it_is_decorator = True
        @wraps(func)
        def closure(*av, **kw):
            timer = copy(self)
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



if __name__ == '__main__':
    import sys

    # simple usage:
    with Timer():
        pass

    # normal usage:
    with Timer(name='test') as timer:
        task_size = 100000000 / 16
        for i in xrange(task_size):
            if i % (task_size / 10) == 0:
                print(timer.duration)

    # functions decoration usage:
    Timer(name='test2')
    def test_routine2():
        print('test_routine2')

    test_routine2()
    test_routine2()