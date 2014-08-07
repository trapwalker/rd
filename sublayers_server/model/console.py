# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

class Shell(object):
    def __init__(self, context):
        self.context = context
        self.context.update(
            CON=self,
            __name__="__console__",
            __doc__=None,
        )

    def run(self, cmd):
        exec cmd in self.context
