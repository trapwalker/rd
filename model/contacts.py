# -*- coding: utf-8 -*-

from collections import OrderedDict
from operator import itemgetter

class Contact(tuple):
    u'''Contact(time, subject, obj)'''
    __slots__ = ()
    _fields = ('time', 'subject', 'obj')

    time = property(itemgetter(0), doc='Time of contact')
    subject = property(itemgetter(2), doc='Subject-contacter')
    obj = property(itemgetter(3), doc='Object-contacter')

    def __new__(cls, time, subject, obj):
        'Create new instance of Contact(time, subj, obj)'
        obj = tuple.__new__(cls, (time, subject, obj))
        # todo: may be need "valid" property
        return obj

    def __repr__(self):
        'Return a nicely formatted representation string'
        return 'Contact(time=%r, subject=%r, obj=%r)' % self

    def __getnewargs__(self):
        'Return self as a plain tuple.  Used by copy and pickle.'
        return tuple(self)

    def __getstate__(self):
        'Exclude the OrderedDict from pickling'
        pass

    def _asdict(self):
        'Return a new OrderedDict which maps field names to their values'
        return OrderedDict(zip(self._fields, self))

    __dict__ = property(_asdict)


