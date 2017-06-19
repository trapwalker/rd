# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from collections import Counter
from functools import wraps
import sys


_STD_STREAMS = dict(stderr=sys.stderr, stdout=sys.stdout)
CALL_BRACKETS_LEVEL_COUNTER = Counter()


def warn_calling(skip=(), unical=True):
    """Make warnings about calls decorated functions"""
    deco = lambda f: f
    if __debug__:
        import functools
        from traceback import extract_stack
        from collections import Counter
        c = Counter()

        def deco(f):
            @functools.wraps(f)
            def closure(*av, **kw):
                msg = 'Call {func}: {fn}:{line} in {f}'.format(
                    func=f.__name__,
                    **dict(zip(['fn', 'line', 'f', '_'], extract_stack(limit=2)[-2]))
                )
                idx = 0
                if unical:
                    idx = c[msg]
                    c[msg] = idx + 1
                if (not unical or idx == 0) and (not any((case in msg for case in skip))):
                    log.warning(msg)
                return f(*av, **kw)

            return closure

    return deco


def call_log(logger='stderr', level='DEBUG'):
    level = logging._checkLevel(level)

    if hasattr(logger, 'log'):
        def to_log(message, level=level):
            logger.log(level=level, msg=message)
    elif hasattr(logger, 'write'):
        def to_log(message, level=level):
            logger.write(message + '\n')
    elif isinstance(logger, basestring) and logger in _STD_STREAMS:
        def to_log(message, level=level):
            _STD_STREAMS[logger].write(message + '\n')
    else:
        raise ValueError('Wrong logger: {!r}'.format(logger))

    def deco(f):
        try:
            from tornado.options import options
        except:
            is_logging_need = True
        else:
            is_logging_need = getattr(options, 'logging_calls', None)

        if is_logging_need is False:
            return f

        # todo: time
        @wraps(f)
        def wrapper(*av, **kw):
            is_async = 'callback' in kw
            if is_async:
                old_callback = kw['callback']
                def callback_cover(*av, **kw):
                    CALL_BRACKETS_LEVEL_COUNTER[id(logger)] -= 1
                    to_log('{indent}CALLBACK({deep})-> *{av!r}, **{kw!r}'.format(indent='  ' * (deep - 1), **locals()))
                    return old_callback(*av, **kw)
                kw['callback'] = callback_cover

            deep = CALL_BRACKETS_LEVEL_COUNTER[id(logger)]
            to_log('{indent}CALL({deep}): {f!r}(*{av!r}, **{kw!r}) -> ...'.format(indent='  ' * deep, **locals()))
            CALL_BRACKETS_LEVEL_COUNTER[id(logger)] += 1
            try:
                result = f(*av, **kw)
            except Exception as e:
                CALL_BRACKETS_LEVEL_COUNTER[id(logger)] -= 1
                to_log('{indent}EXCEPTION({deep})-> {e!r}'.format(indent='  ' * deep, **locals()))
                raise e
            else:
                if result is not None:
                    to_log('{indent}!!?RESULT({deep})-> {result!r}'.format(indent='  ' * deep, **locals()))
                return result

        return wrapper
    return deco


if __name__ == '__main__':
    log.addHandler(logging.StreamHandler(sys.stderr))
    log.level = logging.DEBUG

    @call_log(logger=log)
    def test1(x, y='yy', z=13):
        if y == 'yy3':
            print 3/10

        if x > 0:
            return test1(x - 1, y='yy' + str(x), z=13)

    test1(2, '44')
    test1(3, '55')
