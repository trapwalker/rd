# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from functools import total_ordering

from utils import time_log_format


@total_ordering
class Event(object):
    __str_template__ = '<{self.unactual_mark}{self.classname} #{self.id} [{self.time_str}]>'
    # todo: __slots__

    def __init__(self, server, time=None, comment=None):
        """
        @param float time: Time of event
        """
        self.server = server  # todo: Нужно ли хранить ссылку на сервер в событии?
        self.time = time or server.get_time()
        self.actual = True
        self.comment = comment  # todo: Устранить отладочную информацию

    def send(self):
        self.server.post_event(self)  # todo: test to atomic construction

    def cancel(self):
        self.actual = False

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
        #log.debug('EVENT %s perform', self)
        # todo: extract events log
        pass


class Objective(Event):
    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.units.Unit subj: Subject of contact
        """
        server = obj.server
        super(Objective, self).__init__(server=server, **kw)
        self.obj = obj  # todo: weakref?
        obj.events.append(self)

    def perform(self):
        super(Objective, self).perform()
        self.obj.events.remove(self)
        # todo: fixit

    def cancel(self):
        super(Objective, self).cancel()
        self.obj.events.remove(self)
        # todo: fixit


class Init(Objective):
    def perform(self):
        super(Init, self).perform()
        SearchContacts(subj=self.obj).send()
        # todo: move to 'on_init' method


class Delete(Objective):
    def perform(self):
        super(Delete, self).perform()
        self.obj.on_delete(event=self)


class Subjective(Event):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.subj.classname}#{self.subj.id}>'
    )

    def __init__(self, subj, **kw):
        """
        @param sublayers_server.model.units.Unit subj: Subject of event
        """
        server = subj.server
        super(Subjective, self).__init__(server=server, **kw)
        self.subj = subj  # todo: weakref?
        subj.events.append(self)

    def perform(self):
        super(Subjective, self).perform()
        self.subj.events.remove(self)
        # todo: fixit

    def cancel(self):
        super(Subjective, self).cancel()
        self.subj.events.remove(self)
        # todo: fixit


class SearchContacts(Subjective):
    def __init__(self, interval=0.5, **kw):
        super(SearchContacts, self).__init__(**kw)
        self.interval = interval

    def perform(self):
        super(SearchContacts, self).perform()
        subj = self.subj
        """@type: sublayers_server.model.base.Observer"""
        if subj.is_alive:
            subj.contacts_refresh()
            SearchContacts(subj=subj, time=subj.server.get_time() + self.interval).send()  # todo: make regular interva


class Update(Subjective):
    def __init__(self, cc=None, turn=None, target_point=None, **kw):
        super(Update, self).__init__(**kw)
        self.cc = cc
        self.turn = turn
        self.target_point = target_point

    def perform(self):
        super(Update, self).perform()
        t = self.time
        subj = self.subj
        """@type: sublayers_server.model.units.Mobile"""
        state = subj.state
        is_moving_before = state.is_moving
        state.update(t=t, cc=self.cc, turn=self.turn, target_point=self.target_point)
        is_moving_after = state.is_moving
        subj.on_update(time=t)
        if is_moving_before != is_moving_after:
            if is_moving_after:
                subj.on_start(event=self)
            else:
                subj.on_stop(event=self)
        t_max = state.t_max
        if t_max is not None:
            Update(subj=subj, time=t_max).send()
            # todo: disactualize future event


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
        self.obj = obj
        super(Contact, self).__init__(**kw)
        self.subj.contacts.append(self)
        obj.contacts.append(self)
        #log.debug('EVENT %s add to %s and %s', self, self.subj, obj)

    def cancel(self):
        super(Subjective, self).cancel()
        #self.remove_links()

    def perform(self):
        super(Subjective, self).perform()
        #self.remove_links()

    def remove_links(self):
        try:
            #log.debug('EVENT %s before remove from %s [%s]', self, self.subj, self.subj.contacts)
            self.subj.contacts.remove(self)
        except ValueError:
            log.exception('Subjective contacts clearing: subj=%(subj)s, comment=%(comment)s',
                          dict(subj=self.subj, comment=self.comment))

        try:
            self.obj.contacts.remove(self)
        except ValueError:
            log.exception('Contact contacts clearing: obj=%(obj)s, comment=%(comment)s',
                          dict(obj=self.obj, comment=self.comment))
                          

class ContactSee(Contact):

    def perform(self):
        super(ContactSee, self).perform()
        self.subj.on_contact_in(time=self.time, obj=self.obj, is_boundary=True, comment=self.comment)


class ContactOut(Contact):

    def perform(self):
        super(ContactOut, self).perform()
        self.subj.on_contact_out(time=self.time, obj=self.obj, is_boundary=True, comment=self.comment)


class Callback(Event):

    def __init__(self, func, **kw):
        """
        """
        super(Callback, self).__init__(**kw)
        self.func = func

    def perform(self):
        super(Callback, self).perform()
        return self.func(self)
