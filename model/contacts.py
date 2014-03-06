# -*- coding: utf-8 -*-

from collections import OrderedDict
from operator import itemgetter


class Contact(tuple):
    u"""
    Predicted event associated with the task robot:
        - hit an object in the observed scope of the subject;
        - object escaped from of tile range;
        - task of object is completed.

    Contact(time, subj, obj)
    """
    __slots__ = ()
    _fields = ('time', 'subj', 'obj')

    time = property(itemgetter(0), doc='Time of contact')
    subj = property(itemgetter(2), doc='Subject-contacter')
    obj = property(itemgetter(3), doc='Object-contacter')

    def __new__(cls, time, subj, obj):
        u"""Create new instance of Contact(time, subj, obj)"""
        obj = tuple.__new__(cls, (time, subj, obj))
        # todo: may be need "valid" property
        return obj

    def __repr__(self):
        u"""Return a nicely formatted representation string"""
        return 'Contact(time=%r, subj=%r, obj=%r)' % self

    def __getnewargs__(self):
        u"""Return self as a plain tuple.  Used by copy and pickle."""
        return tuple(self)

    def __getstate__(self):
        u"""Exclude the OrderedDict from pickling"""
        pass

    def _asdict(self):
        u"""Return a new OrderedDict which maps field names to their values"""
        return OrderedDict(zip(self._fields, self))

    __dict__ = property(_asdict)
