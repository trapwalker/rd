# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class Parameter(object):
    def __init__(self, original):
        super(Parameter, self).__init__()
        self.original = original
        self.current = original

    def clear(self):
        self.current = self.original