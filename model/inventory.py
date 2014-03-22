# -*- coding: utf-8 -*-

STD_MAX_STACK_SIZE = 64


class Inventory(object):

    def __init__(self, size=None, things=None):
        """
        @param int size: Capacity of inventory
        @param collections.Iterable[Thing] things:
        """
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

    id = property(id)

    # todo: append, remove, check


class Thing(object):

    def __init__(self, kind, amount=1, max_stack_size=STD_MAX_STACK_SIZE):
        """
        @param int kind: Type of thing
        @param int amount: Amount of thing items
        @param int max_stack_size: Max amount items in stack
        """
        super(Thing, self).__init__()
        assert amount <= max_stack_size
        self.kind = kind
        self.amount = amount
        self.max_stack_size = max_stack_size
        # todo: addition, division, substraction
