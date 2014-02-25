# -*- coding: utf-8 -*-

from utils import get_uid
from balance import BALANCE
from inventory import Inventory

import logging
logging.basicConfig(level='DEBUG')


# todo: class Task
# todo: class Collision
# todo: GEO-index
# todo: fix side effect on edge of tile


class Observer(object):
    u'''todo: make docstring'''

    def __init__(self, owner, r=None):
        super(Observer, self).__init__()
        self._r = r or BALANCE.get_ObserverRange(owner)
        self.subscribers = set()

    def subscribe(self, s):
        if isinstance(s, (list, tuple)):
            s = set(s)
        elif not isinstance(s, set):
            s = {s}
        self.subscribers += s

    def unsubscribe(self, s):
        if isinstance(s, (list, tuple)):
            s = set(s)
        elif not isinstance(s, set):
            s = {s}
        self.subscribers -= s

    @property
    def r(self):
        return self._r


class PointObject(object):

    def __init__(self):
        super(PointObject, self).__init__()

    def get_position(self):
        return None

    position = property(fget=get_position)


class VisibleObject(PointObject):

    def __init__(self, server, position):
        self.server = server
        self.uid = get_uid()
        self._init_point = position
        super(VisibleObject, self).__init__()

    def register(self, server):
        #super(VisibleObject, self).register(server)
        logging.debug('Register: %s', self.__class__.__name__)


class Unit(VisibleObject):
    u'''Abstract class for any GEO-entities'''

    def __init__(self, **kw):
        self.observer = Observer(self)
        super(Unit, self).__init__(**kw)

    def register(self, server):
        super(Unit, self).register(server)
        if self.observer:
            server.register_observer(self.observer)

    # todo: tasks


class Stationary(Unit):
    u'''Abstract class of stationary entities'''

    def __init__(self, **kw):
        super(Stationary, self).__init__(**kw)

    def get_position(self):
        return self._init_point


class Heap(Stationary):
    u'''Heap objects thrown on the map'''
    # todo: rearrange class tree
    def __init__(self, items, **kw):
        super(Heap, self).__init__(**kw)
        self.inventory = Inventory()


class Station(Stationary):
    u'''Class of buildings'''

    def __init__(self, **kw):
        super(Station, self).__init__(**kw)


class Bot(Unit):
    u'''Class of mobile units'''

    def __init__(self, **kw):
        print kw
        super(Bot, self).__init__(**kw)


if __name__ == '__main__':
    pass
