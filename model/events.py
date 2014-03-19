# -*- coding: utf-8 -*-

from utils import get_time


class EType(object):
    __slots__ = ()
    name = None


class ET_See(EType):
    name = 'See'


class ET_Unsee(EType):
    name = 'Unsee'


class ET_NewTask(EType):
    name = 'NewTask'


class Event(object):
    def __init__(self, e_type, time=None, position=None):
        """
        @param EType e_type: Event type
        @param model.utils.TimeClass time: Time of event
        @param model.vectors.Point | None position: Event location
        """
        self.e_type = e_type
        self.time = get_time() if time is None else time
        self.position = position


class Contact(Event):
    def __init__(self, obj, **kw):
        super(Contact, self).__init__(**kw)
        self.obj = obj  # todo: weakref?

