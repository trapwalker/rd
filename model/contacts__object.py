# -*- coding: utf-8 -*-

from collections import OrderedDict
from functools import total_ordering


class KindOfContact(object):
    __slots__ = ()
    name = None


class KC_See(KindOfContact):
    name = 'See'


class KC_Unsee(KindOfContact):
    name = 'Unsee'


@total_ordering
class Contact(object):
    """
    Predicted event associated with the task robot:
        - hit an object in the observed scope of the subject;
        - object escaped from of tile range;
        - task of object is completed.
    """
    __slots__ = ('time', 'subj', 'obj', 'kind', 'is_valid',)

    def __init__(self, time, subj, obj, kind):
        self.time = time
        self.subj = subj
        self.obj = obj
        self.kind = kind
        self.is_valid = True

    def __repr__(self):
        """Return a nicely formatted representation string"""
        return 'Contact(time={self.time!r}, subj={self.subj!r}, obj={self.obj!r}, kind={self.kind!r}{valid_marker})'\
               .format(self=self, valid_marker='' if self.is_valid else ',')

    def __hash__(self):
        return hash((self.time, self.subj, self.obj, self.kind,))

    def __lt__(self, other):
        return self.time < other.time

    def __eq__(self, other):
        return (
            self.time == other.time and
            self.subj == other.subj and
            self.obj  == other.obj  and
            self.kind == other.kind
        )
    
