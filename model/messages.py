# -*- coding: utf-8 -*-

from utils import time_log_format, serialize


class Message(object):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}] sender={self.sender}>'

    def __init__(self, sender, time=None):
        """
        @param model.utils.TimeClass time: Time of message post
        @param model.units.Unit sender: Sender of message
        """
        super(Message, self).__init__()
        self.time = time or sender.server.get_time()
        self.sender = sender

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
            sender=repr(self.sender),  # sender=self.sender.as_dict(),  # todo: Serialize senders
        )

    def serialize(self):
        return serialize(self.as_dict())


class See(Message):
    __str_template__ = '<{self.classname} #{self.id}[{self.time_str}] sender={self.sender}; obj={self.obj}>'

    def __init__(self, obj, **kw):
        """
        @param model.base.VisibleObject obj: Object
        """
        super(See, self).__init__(**kw)
        self.obj = obj

    def as_dict(self):
        d = super(See, self).as_dict()
        obj = self.obj
        d['obj'] = repr(obj)  # todo: Serialize objects
        d['behavior'] = dict(
            position=obj.position,
            v=obj.v if hasattr(obj, 'v') else None,  # todo: Get behavior from unit directly
            # todo: add other behaviors
        )
        return d


class Contact(See):
    pass


class Update(See):
    pass
