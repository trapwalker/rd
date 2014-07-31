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

    def __init__(self, time, comment=None):
        """
        @param float time: Time of event
        """
        self.time = time
        self.actual = True
        self.comment = comment  # todo: Устранить отладочную информацию

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
        @param sublayers_server.model.units.Unit subj: Subject of contact
        """
        super(Subjective, self).__init__(**kw)
        self.subj = subj  # todo: weakref?


class Contact(Subjective):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.subj.classname}#{self.subj.id}-'
        '{self.obj.classname}#{self.obj.id}>'
    )

    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Object of contact
        """
        super(Contact, self).__init__(**kw)
        self.obj = obj

    def perform(self):
        super(Contact, self).perform()
        try:  # todo: Устранить хак
            self.subj.contacts.remove(self)
            self.obj.contacts.remove(self)
        except:
            import traceback
            log.error(traceback.format_exc())


class ContactSee(Contact):

    def perform(self):
        super(ContactSee, self).perform()
        subj = self.subj
        subj.subscribe_to__VisibleObject(self.obj)
        subj.emit_for__Agent(message=messages.Contact(time=self.time, subject=self.subj, obj=self.obj, comment=self.comment))
        # todo: Make 'as_message' method of Event class


class ContactOut(Contact):

    def perform(self):
        super(ContactOut, self).perform()
        self.subj.unsubscribe_from__VisibleObject(self.obj)
        self.subj.emit_for__Agent(message=messages.Out(time=self.time, subject=self.subj, obj=self.obj, comment=self.comment))


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

    def __init__(self, task, **kw):
        """
        """
        subj = task.owner
        super(TaskEnd, self).__init__(subj=subj, **kw)
        self.task = task

    def perform(self):
        super(TaskEnd, self).perform()
        if self.subj.task is self.task:
            self.task.done()
