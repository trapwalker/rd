# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from functools import total_ordering

from utils import time_log_format
import messages


@total_ordering
class Event(object):
    __str_template__ = '<{self.unactual_mark}{self.classname} #{self.id} [{self.time_str}]>'
    # todo: __slots__

    def __init__(self, time):
        """
        @param model.utils.TimeClass time: Time of event
        """
        self.time = time
        self.actual = True

    def __hash__(self):
        return hash((self.time,))

    def __lt__(self, other):
        return (self.time, id(self)) < (other.time, id(other))

    def __le__(self, other):
        return (self.time, id(self)) <= (other.time, id(other))

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

    def perform(self):
        """
        Performing event logic.
        """
        pass


class Subjective(Event):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.subj.classname}#{self.subj.id}>'
    )

    def __init__(self, subj, **kw):
        """
        @param model.units.Unit subj: Subject of contact
        """
        super(Subjective, self).__init__(**kw)
        self.subj = subj  # todo: weakref?

    def perform(self):
        super(Subjective, self).perform()
        log.debug(str(self))


class Contact(Subjective):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.subj.classname}#{self.subj.id}-'
        '{self.obj.classname}#{self.obj.id}>'
    )

    def __init__(self, obj, **kw):
        """
        @param model.base.VisibleObject obj: Object of contact
        """
        super(Contact, self).__init__(**kw)
        self.obj = obj

    def perform(self):
        super(Contact, self).perform()
        self.subj.contacts.remove(self)
        self.obj.contacts.remove(self)


class ContactSee(Contact):

    def perform(self):
        super(ContactSee, self).perform()
        subj = self.subj
        subj.subscribe_to__VisibleObject(self.obj)
        subj.emit_for__Agent(message=messages.Contact(time=self.time, sender=self.subj, obj=self.obj))
        # todo: Make 'as_message' method of Event class


class ContactOut(Contact):

    def perform(self):
        super(ContactOut, self).perform()
        self.subj.unsubscribe_from__VisibleObject(self.obj)


class Callback(Event):

    def __init__(self, func, **kw):
        """
        """
        super(Callback, self).__init__(**kw)
        self.func = func

    def perform(self):
        super(Callback, self).perform()
        return self.func(self)


class TaskEnd(Subjective):

    def perform(self):
        super(TaskEnd, self).perform()
        del self.subj.task