# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class Parameter(object):
    def __init__(self, original, min_value=0.0, max_value=1.0):
        super(Parameter, self).__init__()
        self.original = original
        self.current = original
        self.min_value = min_value
        self.max_value = max_value

    def clear(self):
        self.current = self.original

    @property
    def value(self):
        if self.current > self.max_value:
            return self.max_value
        elif self.current < self.min_value:
            return self.min_value
        else:
            return self.current