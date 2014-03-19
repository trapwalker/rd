# -*- coding: utf-8 -*-

from functools import total_ordering
from utils import get_time


@total_ordering
class Event(object):
    __slots__ = ('time', 'actual',)

    def __init__(self, time=None):
        """
        @param model.utils.TimeClass time: Time of event
        """
        self.time = get_time() if time is None else time
        self.actual = True

    def __hash__(self):
        return hash((self.time,))

    def __lt__(self, other):
        return self.time < other
        # todo: __eq__?

    def __nonzero__(self):
        return self.actual


class Contact(Event):
    __slots__ = ('subj', 'obj',)

    def __init__(self, subj, obj, **kw):
        """
        @param model.units.Unit subj: Subject of contact
        @param model.base.VisibleObject obj: Object of contact
        """
        super(Contact, self).__init__(**kw)
        self.subj = subj  # todo: weakref?
        self.obj = obj


class ContactSee(Contact):
    pass


class ContactUnsee(Contact):
    pass
