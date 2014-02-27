# -*- coding: utf-8 -*-

from operator import attrgetter

__ALL__ = ['Point']

class Point(complex):

    __slots__ = ()

    x = property(attrgetter('real'))
    y = property(attrgetter('imag'))

    def distance(self, p):
        return abs(self - p)

    def normalize(self):
        return self / abs(self)

    # todo: turn vector
    # todo: vector multiply

    ## Syntactic sugar ##

    def __repr__(self):
        return 'Point(x=%r, y=%r)' % (self.x, self.y)

    def __add__(self, y):
        return Point(complex.__add__(self, y))

    def __div__(self, y):
        return Point(complex.__div__(self, y))

    def __mod__(self, y):
        return Point(complex.__mod__(self, y))

    def __mul__(self, y):
        return Point(complex.__mul__(self, y))

    def __neg__(self):
        return Point(complex.__neg__(self))

    def __pow__(self, y, z=None):  # todo: need parameter "z" research
        return Point(complex.__pow__(self, y, z))

    def __radd__(self, y):
        return Point(complex.__radd__(self, y))

    def __rdivmod__(self, y):
        return Point(complex.__rdivmod__(self, y))

    def __rdiv__(self, y):
        return Point(complex.__rdiv__(self, y))

    def __rmod__(self, y):
        return Point(complex.__rmod__(self, y))

    def __rmul__(self, y):
        return Point(complex.__rmul__(self, y))

    def __rpow__(self, x, z=None):
        return Point(complex.__rpow__(self, x, z))

    def __rsub__(self, y):
        return Point(complex.__rsub__(self, y))

    def __rtruediv__(self, y):
        return Point(complex.__rtruediv__(self, y))

    def __sub__(self, y):
        return Point(complex.__sub__(self, y))

    def __truediv__(self, y):
        return Point(complex.__truediv__(self, y))
