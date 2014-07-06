# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from utils import time_log_format, serialize


class Message(object):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}]>'

    def __init__(self, time):
        """
        @param model.utils.TimeClass time: Time of message post
        """
        super(Message, self).__init__()
        self.time = time

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
        )

    def serialize(self):
        return serialize(self.as_dict())


class ChatMessage(Message):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}] @{self.author} SAY "self.text"}>'

    def __init__(self, author, text=None, client_id=None, **kw):
        """
        @param model.units.Unit subject: Sender of message
        """
        super(ChatMessage, self).__init__(**kw)
        self.author = author
        self.text = text
        self.client_id = client_id

    def as_dict(self):
        d = super(ChatMessage, self).as_dict()
        d['author'] = repr(self.subject),  # sender=self.subject.as_dict(),  # todo: Serialize senders
        return d


class UnitMessage(Message):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}] subj={self.subject}>'

    def __init__(self, subject, **kw):
        """
        @param model.units.Unit subject: Sender of message
        """
        super(UnitMessage, self).__init__(**kw)
        self.subject = subject

    def as_dict(self):
        d = super(UnitMessage, self).as_dict()
        d.update(subject=repr(self.subject))  # sender=self.subject.as_dict(),  # todo: Serialize senders
        return d


class See(UnitMessage):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}] subject={self.subject}; obj={self.obj}>'

    def __init__(self, obj, **kw):
        """
        @param model.base.VisibleObject obj: Object
        """
        super(See, self).__init__(**kw)
        self.obj = obj

    def as_dict(self):
        d = super(See, self).as_dict()
        obj = self.obj
        d.update(
            obj=repr(obj),  # todo: Serialize objects
            behavior=dict(
                position=obj.position,
                v=obj.v if hasattr(obj, 'v') else None,  # todo: Get behavior from unit directly
                # todo: add other behaviors
            )
        )
        return d


class Contact(See):
    pass


class Update(See):
    pass
