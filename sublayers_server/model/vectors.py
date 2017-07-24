# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

__all__ = ['Point']

from random import gauss, random
from math import atan2, e, cos, sin, pi

EPS = 1e-9


class Point(complex):

    __slots__ = ()

    x = complex.real
    y = complex.imag

    def __getinitargs__(self):
        return self.x, self.y

    def as_tuple(self):
        # todo: refactor it
        return self.x, self.y

    def as_dict(self):
        return dict(x=self.x, y=self.y)

    @staticmethod
    def polar(r, fi):
        return Point(r * cos(fi), r * sin(fi))

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
        return abs(self.x) < eps and abs(self.y) < eps

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

    @classmethod
    def random_point(cls, radius, center=0):
        pp = Point.polar(radius * random(), 2*pi * random())
        return pp + center

    @classmethod
    def random_in_segment(cls, r_max, center=0, r_min=0, fi=0, dfi=360):
        """
        >> Point.random_point(r_max, center)
        is equivalent to
        >> Point.random_in_segment(r_max, center)

        :param center: Center of segment radius [0, 0] by default
        :param r_max: Big radius of segment
        :param r_min: Small radius of segment (0 by default)
        :param fi: Azimuth to center of segment in degree (0-north by default)
        :param dfi: Angle width of segment in degree
        :return: Uniform distributed randomize point in segment
        """
        alpha = random() * dfi - dfi / 2.0 + fi
        dist = random() * (r_max - r_min) + r_min
        return Point.polar(dist, alpha / 180.0 * pi) + center

    @classmethod
    def scalar_mul(cls, p1, p2):
        return p1.real * p2.real + p1.imag * p2.imag

    def scale(self, v):
        return Point(self.real * v, self.imag * v)

    def rotate(self, fi):
        """
        @param fi: float
        @rtype: Point
        """
        return self * e ** (1j * fi)

    def distance(self, target):
        """
        @param target: Point
        @rtype: float
        """
        return abs(target - self)

    def direction(self, target):
        """
        @param target: Point
        @rtype: float
        """
        return (target - self).angle

    def normalize(self):
        """
        @rtype: Point
        """
        return self / abs(self)

    def cross_mul(self, other):
        """
        @param other: Point
        @rtype: float
        """
        return self.real * other.imag - self.imag * other.real

    # todo: turn vector
    # todo: vector multiply

    ## Syntactic sugar ##

    def __repr__(self):
        return 'Point(x={}, y={})'.format(self.x, self.y)
        # todo: override __init__

    def __str__(self):
        return '[{}, {}]'.format(self.x, self.y)

    def __format__(self, format_spec):
        # import sys; print >>sys.stderr, format_spec
        return '[{self.x:{format_spec}}, {self.y:{format_spec}}]'.format(**locals())

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


def normalize_angle(angle):
    u"""
    Приводит полученный угол к диапазону 0 <= angle < 2 * pi
    """
    # todo: перейти на итеративный алгоритм
    if angle < 0: return normalize_angle(angle + 2 * pi)
    if angle >= 2 * pi: return normalize_angle(angle - 2 * pi)
    return angle


def shortest_angle(angle):
    u"""
    Приводит полученный угол к диапазону -pi < angle <= pi
    """
    ang = normalize_angle(angle)
    if ang > pi:
        return 2 * pi - ang
    return ang