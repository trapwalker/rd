# -*- coding: utf-8 -*-

from utils import get_uid
from balance import BALANCE

import logging
logging.basicConfig(level='DEBUG')


# todo: class Task
# todo: class Collision
# todo: GEO-index
# todo: fix side effect on edge of tile


class Observer(object):
    u'''Mixin class for injection of observer functionality'''

    def __init__(self, server, r=None, subscribers=None, **kw):
        super(Observer, self).__init__()
        self._r = r or BALANCE.get_ObserverRange(self)
        self.subscribers = set(subscribers or [])

        server.register_observer(self)

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
        pass


class Unit(object):
    u'''Abstract class for any GEO-entities'''

    def __init__(self, server, position, owner=None):
        self.server = server
        self.uid = get_uid()
        self.owner = owner
        self.events = []
        self._position = position
        super(Unit, self).__init__()

    @property
    def position(self):
        return self._position

    def register(self, server):
        # todo: make registeration into the server
        # todo: logging
        print 'Register: {} {}'.format(
            self.__class__.__name__,
            self.range_of_view if isinstance(self, WitnessMixin) else '',
        )


class Stationary(Unit):
    u'''Abstract class of stationary entities'''

    def __init__(self, **kw):
        super(Stationary, self).__init__(**kw)


class Heap(Stationary):
    u'''Heap objects thrown on the map'''

    def __init__(self, items, **kw):
        super(Heap, self).__init__(**kw)
        self.items = items


class Station(Stationary, WitnessMixin):
    u'''Class of buildings'''

    def __init__(self, **kw):
        super(Station, self).__init__(**kw)


class Bot(Unit, WitnessMixin):
    u'''Class of mobile units'''

    def __init__(self, **kw):
        print kw
        super(Bot, self).__init__(**kw)


if __name__ == '__main__':
    pass
