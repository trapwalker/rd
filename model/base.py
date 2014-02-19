# -*- coding: utf-8 -*-

from collections import namedtuple
from uuid import uuid1 as get_uid

Point = namedtuple('Point', 'x y')


class Event(object):
    def __init__(self, eType, position=None):
        self.position = position


# todo: class Task
# todo: class Collision
# todo: GEO-index
# todo: fix side effect on edge of tile

class Server(object):

    def __init__(self, uid=None):
        self.uid = uid or get_uid()
        self.units = {}
        self.stations = {}
        self.robots = {}


class LocalServer(Server):
    pass


class RemoteServer(Server):

    def __init__(self, uid, uri):
        super(RemoteServer, self).__init__(self, uid)
        self.uri = uri


class WitnessMixin(object):
    u'''Mixin class for injection of witness functionality'''

    def witness_init(self):
        self.subscribers = set()
        self.r = 100 * 5 if isinstance(self, Stationary) else 1

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
    def range_of_view(self):
        return self.r


class Unit(object):
    u'''Abstract class for any GEO-entities'''

    def __init__(self, server, position, owner=None):
        self.server = server
        self.uid = get_uid()
        self.owner = owner
        self.events = []
        self._position = position
        if isinstance(self, WitnessMixin):
            self.witness_init()

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
