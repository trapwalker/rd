# -*- coding: utf-8 -*-

import logging
import sys

if __name__ == '__main__':
    logging.basicConfig(
        stream=sys.stderr,
        level=logging.DEBUG,
    )

log = logging.getLogger(__name__)

from threading import Thread
from functools import update_wrapper


class AsyncCallThread(Thread):

    def __init__(self, target, result_callback=None, error_callback=None, exceptions=(), args=(), kwargs=None, **kw):
        """
            target - target function or any callable object
            result_callback - function with one argument `result` that called after end of target function
            error_callback - function with one argument `error` that called if exception occurred
            exceptions - set of exceptions classes to catch
            args - tuple of arguments of the target function
            kwargs - mapping of arguments of the target function            
        """
        super(AsyncCallThread, self).__init__(**kw)
        self.target = target
        self.args = args
        self.kwargs = kwargs
        self.result_callback = result_callback
        self.error_callback = error_callback
        self.exceptions = exceptions

    def run(self):
        try:
            log.debug('%s.run()', self)
            if self.target:
                result = self.target(*self.args, **self.kwargs)
                log.debug('after target result: %s -> %s', result, self.result_callback)
                if self.result_callback:
                    log.debug('before result callback')
                    self.result_callback(result)
                    log.debug('after result callback')
        except self.exceptions as e:
            if self.error_callback:
                self.error_callback(e)
        finally:
            # Avoid a refcycle if the thread is running a function with
            # an argument that has a member that points to the thread.
            del self.target, self.args, self.kwargs


def async_deco(func, result_callback=None, error_callback=None, exceptions=()):
    def closure(*args, **kwargs):
        log.debug('before thread create')
        thread = AsyncCallThread(
            target=func,
            result_callback=result_callback, error_callback=error_callback, exceptions=exceptions,
            args=args, kwargs=kwargs)
        log.debug('before thread start')
        thread.start()
        log.debug('after thread start')
        return thread

    update_wrapper(closure, f)
    return closure


if __name__ == '__main__':
    import random
    def f(x=20):
        log.debug('start f(%s)', x)
        s = 0
        for i in range(x * 1000000):
            s += i ** 0.5

        # Генерируется один из трёх вариантов исключения или не генерируется (вероятность исходов 1/4)
        t, e = {
            0: ['No error', lambda: None],
            1: ['ZeroDivisionError', lambda: 3 / 0],
            2: ['AttributeError', lambda: s.iii],
            3: ['IndexError (uncatchable)', lambda: [].pop()],
        }[random.randrange(4)]
        log.debug('%s generate', t)
        e()
            
        log.debug('end f(%s)->%s', x, s)
        return s

    def on_result(result):
        """async call result handler"""
        log.debug('on_result(%s)', result)

    def on_error(error):
        """async call error handler"""
        log.debug('on_error(%s)', error)

    ff = async_deco(f, result_callback=on_result, error_callback=on_error, exceptions=(ZeroDivisionError, AttributeError,))
    print ff(10)
        
