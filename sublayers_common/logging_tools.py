#!/usr/bin/env python
from __future__ import print_function

import logging
import sys

class Formatter(logging.Formatter):
    def formatException(self, ei):
        res = super(Formatter, self).formatException(ei)
        res = res.decode('utf-8')
        return res


def handler(cls=logging.StreamHandler, fmt=None, level=None, **kw):
    h = cls(**kw)
    if level is not None:
        h.setLevel(level)

    if fmt:
        if isinstance(fmt, basestring):
            fmt = logging.Formatter(fmt)
        elif isinstance(fmt, tuple):
            fmt = logging.Formatter(*fmt)
        elif isinstance(fmt, dict):
            fmt = logging.Formatter(**fmt)
        h.setFormatter(fmt)

    return h


def logger(qualname, handlers=None, level='DEBUG', propagate=1):
    l = logging.getLogger(qualname)
    l.setLevel(level)
    l.propagate = propagate

    # remove old handlers
    old_handlers = l.handlers[:]
    if old_handlers:
        print(
            'WARNING: Logger {} already has a handlers. They wil be removed: {!r}'.format(qualname or '<ROOT>', old_handlers),
            file=sys.stderr,
        )
    for h in old_handlers:
        l.removeHandler(h)

    for h in handlers or ():
        l.addHandler(h)

    return l
