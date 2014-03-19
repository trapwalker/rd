# -*- coding: utf-8 -*-

from collections import OrderedDict
from operator import itemgetter


class KindOfContact(object):
    __slots__ = ()
    name = None


class KC_See(KindOfContact):
    name = 'See'


class KC_Unsee(KindOfContact):
    name = 'Unsee'


class Contact(tuple):
    """
    Predicted event associated with the task robot:
        - hit an object in the observed scope of the subject;
        - object escaped from of tile range;
        - task of object is completed.
    """
    __slots__ = ()
    _fields = ('time', 'subj', 'obj', 'kind')

    time = property(itemgetter(0), doc='Time of contact')
    subj = property(itemgetter(1), doc='Subject-contacter')
    obj = property(itemgetter(2), doc='Object-contacter')
    kind = property(itemgetter(3), doc='Kind of contact')

    def __new__(cls, time, subj, obj, kind):
        """
        Create new instance of Contact(time, subj, obj)
        Contact(time, subj, obj, kind)
            @param time: model.utils.TimeClass
            @param subj: model.units.Unit
            @param obj: model.base.VisibleObject
            @param kind: KindOfContact
        """
        obj = tuple.__new__(cls, (time, subj, obj, kind))
        # todo: may be need "valid" property
        return obj

    def __init__(self, *av, **kw):
        super(Contact, self).__init__(*av, **kw)
        # todo: review, optimize

    def __repr__(self):
        """Return a nicely formatted representation string"""
        return 'Contact(time=%r, subj=%r, obj=%r, kind=%r)' % self

    def __getnewargs__(self):
        """Return self as a plain tuple. Used by copy and pickle."""
        return tuple(self)

    def __getstate__(self):
        """Exclude the OrderedDict from pickling"""
        pass

    def _asdict(self):
        """Return a new OrderedDict which maps field names to their values"""
        return OrderedDict(zip(self._fields, self))

    __dict__ = property(_asdict)
