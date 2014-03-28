# -*- coding: utf-8 -*-

from functools import total_ordering

from utils import time_log_format

@total_ordering
class Event(object):
    __slots__ = ('time', 'actual',)
    __str_template__ = '<{self.unactual_mark}{self.__class__.__name__} #{self.id} [{self.time_str}]>'

    def __init__(self, time):
        """
        @param model.utils.TimeClass time: Time of event
        """
        self.time = time
        self.actual = True

    def __hash__(self):
        return hash((self.time,))

    def __lt__(self, other):
        return self.time < other
        # todo: __eq__?

    def __nonzero__(self):
        return self.actual

    def __str__(self):
        return self.__str_template__.format(self=self)

    @property
    def unactual_mark(self):
        return '' if self.actual else '~'

    @property
    def time_str(self):
        return time_log_format(self.time)

    @property
    def classname(self):
        return self.__class__.__name__

    __repr__ = __str__

    id = property(id)


class Contact(Event):
    __slots__ = ('subj', 'obj',)
    __str_template__ = '<{self.unactual_mark}{self.__class__.__name__} #{self.id} [{self.time_str}] {self.subj}-{self.obj}>'

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


class ContactOut(Contact):
    pass


class Callback(Event):
    __slots__ = ('func',)

    def __init__(self, func, **kw):
        """
        """
        super(Callback, self).__init__(**kw)
        self.func = func

    def run(self):
        return self.func(self)

