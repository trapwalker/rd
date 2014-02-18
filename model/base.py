# -*- coding: utf-8 -*-

from collections import namedtuple


Point = namedtuple('Point', 'x y')


class Event(object):
    def __init__(self, eType, position=None):
        self.position = position


class Unit(object):
    u'''Abstract class for any GEO-entities'''
    
    def __init__(self, owner, position):
        self.owner = owner
        self.events = []
        self._position = position

    @property
    def position(self):
        return self._position


class Stationary(Unit):
    u'''Abstract class of stationary entities'''

    def __init__(self, **kw):
        super(Stationary, self).__init__(**kw)


class Station(Stationary):
    u'''Class of buildings'''

    def __init__(self, **kw):
        super(Station, self).__init__(**kw)


class Bot(Unit):
    u'''Class of mobile units'''

    def __init__(self, **kw):
        super(Bot, self).__init__(**kw)


# todo: Mixin for witness units