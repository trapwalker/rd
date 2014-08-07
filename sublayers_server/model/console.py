# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

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
