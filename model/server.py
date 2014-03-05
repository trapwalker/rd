# -*- coding: utf-8 -*-

from utils import get_uid, TimelineQueue
from units import Unit, Bot


class Server(object):

    def __init__(self, uid=None):
        self.uid = uid or get_uid()
        # todo: GEO-indexing collections
        self.objects = {}  # Total GEO-objects in game by uid
        self.statics = []  # Stationary objects (stations, heaps, standing robots)  # todo: GEO-index
        self.motions = []  # Active motion tasks  # todo: GEO-index
        self.static_observers = []  # todo: GEO-index
        self.timeline = TimelineQueue()

    def filter_motions(self, quadrant):
        return self.tasks  # todo: filter collection by quadrant


class LocalServer(Server):

    def __init__(self, **kw):
        super(LocalServer, self).__init__(**kw)


class RemoteServer(Server):

    def __init__(self, uri, **kw):
        super(RemoteServer, self).__init__(**kw)
        self.uri = uri
