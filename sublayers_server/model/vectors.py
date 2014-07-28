# -*- coding: utf-8 -*-

__all__ = ['Point']

from random import gauss
from math import atan2, e

EPS = 1e-9


class Point(complex):

    __slots__ = ()

    x = complex.real
    y = complex.imag

    @property
    def angle(self):
        """
        @rtype: float
        """
        return atan2(self.imag, self.real)

    def angle_with(self, other):
        """
        @param other: Point
        @rtype: float
        """
        return (other / self).angle

    def is_zero(self, eps=EPS):
        """
        @param eps: float
        @rtype: bool
        """
        return (other / self).angle
        return self.x < eps and self.y < eps

    @classmethod
    def random_gauss(cls, mu, sigma):
        """
        @param mu: Point
        @param sigma: Point | float
        @rtype: Point
        """
        if not isinstance(sigma, Point):
            sigma = Point(sigma, sigma)
        return Point(gauss(mu.x, sigma.x), gauss(mu.y, sigma.y))

    def rotate(self, fi):
        """
        @param fi: float
        @rtype: Point
        """
        return self * e ** (1j * fi)

    def distance(self, p):
        """
        @param p: Point
        @rtype: float
        """
        return abs(self - p)

    def normalize(self):
        """
        @rtype: Point
        """
        return self / abs(self)

    def cross_mul(a, b):
        """
        @param b: Point
        @rtype: float
        """
        return a.x * b.y - a.y * b.x

    # todo: turn vector
    # todo: vector multiply

    ## Syntactic sugar ##

    def __repr__(self):
        return 'Point(x={}, y={})'.format(self.x, self.y)
        # todo: override __init__

    def __str__(self):
        return '[{:g}, {:g}]'.format(self.x, self.y)

    def __add__(self, p):
        """
        @param p: Point
        @rtype: Point
        """
        return Point(complex.__add__(self, p))

    def __div__(self, p):
        """
        @param p: Point | float
        @rtype: Point
        """
        return Point(complex.__div__(self, p))

    def __mod__(self, p):
        """
        @param p: Point | float
        @rtype: Point
        """
        return Point(complex.__mod__(self, p))

    def __mul__(self, p):
        """
        @param p: Point | float
        @rtype: Point
        """
        return Point(complex.__mul__(self, p))

    def __neg__(self):
        """
        @rtype: Point
        """
        return Point(complex.__neg__(self))

    def __pow__(self, v):  # todo: need parameter "z" research
        """
        @param v: Point
        @rtype: Point
        """
        return Point(complex.__pow__(self, v))

    def __radd__(self, p):
        """
        @param p: Point
        @rtype: Point
        """
        return Point(complex.__radd__(self, p))

    def __rdivmod__(self, y):
        return Point(complex.__rdivmod__(self, y))

    def __rdiv__(self, v):
        """
        @param v: Point } floar
        @rtype: Point
        """
        return Point(complex.__rdiv__(self, v))

    def __rmod__(self, v):
        """
        @param v: Point } floar
        @rtype: Point
        """
        return Point(complex.__rmod__(self, v))

    def __rmul__(self, v):
        """
        @param v: Point } floar
        @rtype: Point
        """
        return Point(complex.__rmul__(self, v))

    def __rpow__(self, v):
        """
        @param v: Point } floar
        @rtype: Point
        """
        return Point(complex.__rpow__(self, v))

    def __rsub__(self, p):
        """
        @param p: Point
        @rtype: Point
        """
        return Point(complex.__rsub__(self, p))

    def __rtruediv__(self, p):
        """
        @param p: Point
        @rtype: Point
        """
        return Point(complex.__rtruediv__(self, p))

    def __sub__(self, p):
        """
        @param p: Point
        @rtype: Point
        """
        return Point(complex.__sub__(self, p))

    def __truediv__(self, p):
        """
        @param p: Point | float
        @rtype: Point
        """
        return Point(complex.__truediv__(self, p))

if __name__ == '__main__':
    P = Point
