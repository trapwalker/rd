# -*- coding: utf-8 -*-

__ALL__ = ['get_uid', 'Point']

from operator import itemgetter
from collections import OrderedDict
from math import sqrt, pow

from uuid import uuid1 as get_uid

class Point(tuple):
    u'''Point(x, y)'''

    def __new__(cls, x, y):
        return tuple.__new__(cls, (x, y))

    def __repr__(self):
        return 'Point(x=%r, y=%r)' % self

    def __getnewargs__(self):
        'Return self as a plain tuple.  Used by copy and pickle.'
        return tuple(self)

    def _asdict(self):
        'Return a new OrderedDict which maps field names to their values'
        return OrderedDict(zip(('x', 'y'), self))

    def __getstate__(self):
        'Exclude the OrderedDict from pickling'
        pass

    __slots__ = ()

    __dict__ = property(_asdict)

    x = property(itemgetter(0), doc='Alias for field number 0')

    y = property(itemgetter(1), doc='Alias for field number 1')

    # Vector algebra
    
    def distance(self, p):
        return sqrt((self.x - p.x) ** 2 + (self.y - p.y) ** 2)

    def distance2(self, p):
        return (self.x - p.x) ** 2 + (self.y - p.y) ** 2

