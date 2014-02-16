# -*- coding: utf-8 -*-

from collections import namedtuple


Point = namedtuple('Point', 'x y')


class Event(object):
    def __init__(self, eType, position=None):
        self.position = position


class Unit(object):
    
    def __init__(self, owner, position):
        self.owner = owner
        self.events = []
        self.position = position

    @property
    def position(self):
        return None


class Station(Unit):

    def __init__(self, owner):
        pass
