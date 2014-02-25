# -*- coding: utf-8 -*-

STD_MAX_STACK_SIZE = 64


class Inventory(object):

    def __init__(self, size=None, things=None):
        self.size = size
        self.things = things or []

    @property
    def is_full(self):
        return self.size is not None and len(self.things) >= self.size

    @property
    def is_empty(self):
        return not self.things

    @property
    def count(self):
        return len(self.things)

    # todo: append, remove, check


class Thing(object):

    def __init__(self, kind, amount=1, max_stack_size=STD_MAX_STACK_SIZE):
        super(Thing, self).__init__()
        assert amount <= max_stack_size
        self.kind = kind
        self.amount = amount
        self.max_stack_size = max_stack_size
        # todo: addition, division, substraction
