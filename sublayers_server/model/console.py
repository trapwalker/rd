# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import functools


def command_deco(func):
    def closure(*av, **kw):
        return func(*av, **kw)

    functools.update_wrapper(closure, func)
    return closure


class Shell(object):
    def __init__(self, global_context, local_context=None):
        self.global_context = global_context
        self.local_context = local_context or {}
        self.local_context.update(
            CON=self,
            __name__="__console__",
            __doc__=None,
        )

    def run(self, cmd):
        exec cmd in self.global_context, self.local_context


