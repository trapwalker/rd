# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from utils import time_log_format, serialize


class Message(object):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}]>'

    def __init__(self, time, comment=None):
        """
        @param sublayers_server.model.utils.TimeClass time: Time of message post
        """
        super(Message, self).__init__()
        self.time = time
        self.comment = comment

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

    def serialize(self):
        return serialize(self.as_dict())


class InitMessage(Message):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}] {self.agent}}>'

    def __init__(self, agent, time=None, **kw):
        """
        @param sublayers_server.model.agents.Agent agent
        """
        if not time:
            time = agent.server.get_time()
        super(InitMessage, self).__init__(time=time, **kw)
        self.agent = agent

    def as_dict(self):
        d = super(InitMessage, self).as_dict()
        d.update(
            agent=self.agent.as_dict(),
            cars=[car.as_dict() for car in self.agent.cars],
        )
        return d


class ChatMessage(Message):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}] @{self.author} SAY "self.text"}>'

    def __init__(self, author, text=None, client_id=None, time=None, **kw):
        """
        @param sublayers_server.model.agents.Agent author: Sender of message
        @param unicode text: message text
        """
        if not time:
            time = author.server.get_time()
        super(ChatMessage, self).__init__(time=time, **kw)
        self.author = author
        self.text = text
        self.client_id = client_id

    def as_dict(self):
        d = super(ChatMessage, self).as_dict()
        d.update(
            author=self.author.as_dict(),
            text=self.text,
            id=self.client_id,
        )
        return d


class UnitMessage(Message):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}] subj={self.subject}>'

    def __init__(self, subject, time=None, **kw):
        """
        @param sublayers_server.model.units.Unit subject: Sender of message
        """
        if not time:
            time = subject.server.get_time()
        super(UnitMessage, self).__init__(time=time, **kw)
        self.subject = subject

    def as_dict(self):
        d = super(UnitMessage, self).as_dict()
        d.update(subject_id=self.subject.uid)
        return d


class RangeViewMessage(UnitMessage):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}] subject={self.subject}; obj={self.obj}>'

    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Object
        """
        super(RangeViewMessage, self).__init__(**kw)
        self.obj = obj


class Out(RangeViewMessage):
    def as_dict(self):
        d = super(Out, self).as_dict()
        d.update(object_id=self.obj.uid)
        return d


class See(RangeViewMessage):

    def as_dict(self):
        d = super(See, self).as_dict()
        d.update(object=self.obj.as_dict())  # todo: Serialize objects with private case
        return d


class Contact(See):
    pass


class Update(See):
    pass
