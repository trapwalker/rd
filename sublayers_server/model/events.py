# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)
log.info('\n\n\n')

from functools import total_ordering
from utils import time_log_format
from messages import FireDischargeEffect

@total_ordering
class Event(object):
    __str_template__ = '<{self.unactual_mark}{self.classname} #{self.id} [{self.time_str}]>'
    # todo: __slots__

    def __init__(self, server, time=None, callback_before=None, callback_after=None, comment=None):
        """
        @param float time: Time of event
        """
        self.server = server  # todo: Нужно ли хранить ссылку на сервер в событии?
        self.time = time or server.get_time()
        self.actual = True
        self.callback_before = callback_before
        self.callback_after = callback_after
        self.comment = comment  # todo: Устранить отладочную информацию

    def post(self):
        self.server.post_event(self)  # todo: test to atomic construction
        log.info('POST   %s', self)

    def cancel(self):
        if self.actual:
            self.on_cancel()
            self.actual = False
            log.info('CANCEL %s', self)
        else:
            log.warning('Double cancelling event: %s', self)

    def on_cancel(self):
        pass

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
        assert self.actual
        log.info('RUN    %s', self)
        if self.callback_before is not None:
            self.callback_before(event=self)
        self.on_perform()
        if self.callback_after is not None:
            self.callback_after(event=self)

    def on_perform(self):
        pass


class Objective(Event):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.obj.classname}#{self.obj.id}>')

    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.base.Object obj: Object of event
        """
        server = obj.server
        super(Objective, self).__init__(server=server, **kw)
        self.obj = obj  # todo: weakref?
        obj.events.append(self)

    def on_perform(self):
        super(Objective, self).on_perform()
        self.obj.events.remove(self)

    def on_cancel(self):
        super(Objective, self).on_cancel()
        self.obj.events.remove(self)


class Init(Objective):
    def on_perform(self):
        super(Init, self).on_perform()
        self.obj.on_init(self)


class Die(Objective):
    def on_perform(self):
        super(Die, self).on_perform()
        self.obj.on_die(self)


class Delete(Objective):
    def on_perform(self):
        super(Delete, self).on_perform()
        self.obj.on_before_delete(event=self)
        self.obj.limbo = True
        events = self.obj.events
        t_max = (max(events).time + 1.0) if events else None  # todo: extract to constant 'limbo_timeout'
        log.debug('Termination of %s set to %s', self.obj, t_max)
        DeleteEnd(obj=self.obj, time=t_max).post()


class DeleteEnd(Objective):
    def on_perform(self):
        super(DeleteEnd, self).on_perform()
        self.obj.on_after_delete(event=self)


class SearchContacts(Objective):

    def on_perform(self):
        super(SearchContacts, self).on_perform()
        obj = self.obj
        """@type: sublayers_server.model.base.Observer"""
        interval = obj.contacts_check_interval
        if obj.is_alive and interval:
            obj.on_contacts_check()  # todo: check it
            SearchContacts(obj=obj, time=obj.server.get_time() + interval).post()  # todo: make regular interva


class Contact(Objective):
    __str_template__ = (
        '<{self.unactual_mark}{self.classname}#{self.id} [{self.time_str}] '
        '{self.subj.classname}#{self.subj.id}-'
        '{self.obj.classname}#{self.obj.id}>')

    def __init__(self, obj, subj, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Object of contact
        @param sublayers_server.model.base.Observer subj: Subject of contact
        """

        assert subj.is_alive and not subj.limbo
        self.subj = subj
        super(Contact, self).__init__(obj=obj, **kw)


class ContactSee(Contact):

    def on_perform(self):
        super(ContactSee, self).on_perform()
        self.subj.on_contact_in(time=self.time, obj=self.obj, is_boundary=True, comment=self.comment)


class ContactOut(Contact):

    def on_perform(self):
        super(ContactOut, self).on_perform()
        self.subj.on_contact_out(time=self.time, obj=self.obj, is_boundary=True, comment=self.comment)


class FireDischargeEvent(Objective):
    def __init__(self, side, **kw):
        super(FireDischargeEvent, self).__init__(**kw)
        self.side = side

    def on_perform(self):
        super(FireDischargeEvent, self).on_perform()
        self.obj.on_fire_discharge(self)


class FireDischargeEffectEvent(Objective):
    def __init__(self, side, **kw):
        super(FireDischargeEffectEvent, self).__init__(**kw)
        self.side = side

    def on_perform(self):
        super(FireDischargeEffectEvent, self).on_perform()
        targets = []
        for sector in self.obj.fire_sectors:
            if sector.side == self.side:
                for target in sector.target_list:
                    targets.append(target.position)

        # todo: добавить гео-позиционный фильтр агентов
        subj_position = self.obj.position
        for agent in self.server.agents.values():
            for target in targets:
                FireDischargeEffect(agent=agent, pos_subj=subj_position, pos_obj=target).post()


class FireAutoEnableEvent(Objective):
    def __init__(self, side, enable, **kw):
        super(FireAutoEnableEvent, self).__init__(**kw)
        self.side = side
        self.enable = enable

    def on_perform(self):
        super(FireAutoEnableEvent, self).on_perform()
        self.obj.on_fire_auto_enable(self)

