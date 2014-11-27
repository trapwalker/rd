# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from utils import time_log_format, serialize


def make_push_package(events):
    events = [event.as_dict() for event in events]
    return dict(
        message_type='push',
        events=events,
    )


class Message(object):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}]>'

    def __init__(self, agent, time=None, comment=None):
        """
        @param sublayers_server.model.utils.TimeClass time: Time of message post
        """
        if time is None:
            time = agent.server.get_time()
        super(Message, self).__init__()
        self.agent = agent
        self.time = time
        self.comment = comment

    def send(self):
        # todo: online status optimization
        connection = self.agent.connection
        log.debug('\n\ntry_to_send message: %s by connection %s', self, connection)
        if connection:
            connection.send(serialize(make_push_package([self])))

    def __str__(self):
        return self.__str_template__.format(self=self)

    @property
    def time_str(self):
        return time_log_format(self.time)

    @property
    def classname(self):
        return self.__class__.__name__

    id = property(id)

    def as_dict(self):
        return dict(
            cls=self.classname,
            time=self.time,
            comment=self.comment,
        )


class Init(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def as_dict(self):
        d = super(Init, self).as_dict()
        d.update(
            agent=self.agent.as_dict(),
            cars=[car.as_dict(self.time) for car in self.agent.cars],
        )
        return d


class Chat(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] @{self.author} SAY "self.text">'

    def __init__(self, author, text=None, client_id=None, **kw):
        """
        @param sublayers_server.model.agents.Agent author: Sender of message
        @param unicode text: message text
        """
        super(Chat, self).__init__(**kw)
        self.author = author
        self.text = text
        self.client_id = client_id

    def as_dict(self):
        d = super(Chat, self).as_dict()
        d.update(
            author=self.author.as_dict(),
            text=self.text,
            id=self.client_id,
        )
        return d


class Subjective(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] subj={self.subj}>'

    def __init__(self, subj, **kw):
        """
        @param sublayers_server.model.units.Unit subj: Sender of message
        """
        super(Subjective, self).__init__(**kw)
        self.subj = subj

    def as_dict(self):
        d = super(Subjective, self).as_dict()
        d.update(subject_id=self.subj.uid)
        return d


class Update(Message):
    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Sender of message
        """
        super(Update, self).__init__(**kw)
        self.obj = obj

    def as_dict(self):
        d = super(Update, self).as_dict()
        d.update(object=self.obj.as_dict())
        return d


class Contact(Subjective):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] subj={self.subj}; obj={self.obj}>'

    def __init__(self, obj, is_boundary, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Object
        @param bool is_boundary: True if this contact about penetration into the visibility sphere
        """
        super(Contact, self).__init__(**kw)
        self.obj = obj
        self.is_boundary = is_boundary

    def as_dict(self):
        d = super(Subjective, self).as_dict()
        d.update(
            subject_id=self.subj.uid,
            is_boundary=self.is_boundary,
        )
        return d


class See(Contact):

    def __init__(self, is_first, **kw):
        """
        @param bool is_first: True if this contact is first for that agent
        """
        super(Contact, self).__init__(**kw)
        self.is_first = is_first

    def as_dict(self):
        d = super(See, self).as_dict()
        d.update(
            object=self.obj.as_dict(to_time=self.time),  # todo: Serialize objects with private case
            is_first=self.is_first,
        )
        return d


class Out(Contact):

    def __init__(self, is_last, **kw):
        """
        @param bool is_last: True if this contact is last for that agent
        """
        super(Contact, self).__init__(**kw)
        self.is_last = is_last

    def as_dict(self):
        d = super(Out, self).as_dict()
        d.update(
            object_id=self.obj.uid,
            is_last=self.is_last,
        )
        return d
