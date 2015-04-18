# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class Parameter(object):
    def __init__(self, owner, name, original, min_value=None, max_value=None):
        super(Parameter, self).__init__()
        self.name = name
        self.original = original
        self.current = original
        self.min_value = min_value
        self.max_value = max_value
        owner.params.update({name: self})

    def clear(self):
        self.current = self.original

    @property
    def value(self):
        if (self.max_value is not None) and (self.current > self.max_value):
            return self.max_value
        elif (self.min_value is not None) and (self.current < self.min_value):
            return self.min_value
        else:
            return self.current