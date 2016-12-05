# -*- coding: utf-8 -*-
from __future__ import print_function

import sys
import logging
log = logging.getLogger(__name__)


if __name__ == '__main__':
    log = logging.getLogger()
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))


import os
import time
from datetime import datetime
from functools import wraps


class Timer(object):
    def __init__(
            self,
            name=None,
            logger=log,
            log_start='Timer {self.name!r} started at {self.time_start}',
            log_stop='Timer {self.name!r} stopped at {self.time_stop}. Duration is {self.duration}s',
            **kw
        ):
        self.name = name
        self.logger = logger
        self.log_start = log_start
        self.log_stop = log_stop
        self.timestamp_start = None
        self.timestamp_stop = None
        self.__dict__.update(kw)

    @property
    def time_start(self):
        return None if self.timestamp_start is None else datetime.fromtimestamp(self.timestamp_start)
        
    @property
    def time_stop(self):
        return None if self.timestamp_stop is None else datetime.fromtimestamp(self.timestamp_stop)

    def start(self):
        t = time.time()
        self.timestamp_start = t
        if self.log_start:
            self.logger.debug(self.log_start.format(self=self))
        return t

    def stop(self):
        t = time.time()
        self.timestamp_stop = t
        if self.log_stop:
            self.logger.debug(self.log_stop.format(self=self))
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
    
    def __enter__(self):
        self.start()
        return self

    def __exit__(self, ex_type, ex_value, traceback):
        self.stop()


def timer_deco(*timer_av, **timer_kw):
    def deco(func):
        @wraps(func)
        def closure(*av, **kw):
            timer = Timer(*timer_av, **timer_kw)
            if timer.name is None:  # TODO: ##OPTIMIZE extract from closure
                # todo: call number store
                timer.name = 'FUNC {func.func_name} [{fn}:{func.func_code.co_firstlineno}]'.format(
                    func=func,
                    fn=os.path.basename(func.func_code.co_filename),
                )
                
            with timer:
                return func(*av, **kw)

        return closure

    # if not need to timer configuration, we can use @timer_deco without brackets
    if not timer_kw and len(timer_av) == 1 and callable(timer_av[0]):
        func = timer_av[0]
        timer_av = []
        return deco(func)
        
    return deco
        

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
                pass

    # functions decoration usage:
    @timer_deco()
    def test_routine():
        pass

    test_routine()
