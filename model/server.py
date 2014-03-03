# -*- coding: utf-8 -*-

from utils import get_uid, TimelineQueue
from base import Stationary
from units import Unit, Bot


class Server(object):

    def __init__(self, uid=None):
        self.uid = uid or get_uid()
        # todo: GEO-indexing collections
        self.objects = {}  # Total GEO-objects in game by uid
        self.mobiles = []  # Mobile objects (robots only) in motion
        self.statics = []  # Stationary objects (stations, heaps, standing robots)
        self.static_observers = []
        self.mobile_observers = self.mobiles  # All mobile objects is observers now

        self.tasks = []  # todo: GEO-indexed collection

        self.timeline = TimelineQueue()

    def filter_tasks(self, quadrant):
        return self.tasks  # todo: filter collection by quadrant

    def register_task(self, task):
        self.tasks.append(task)

    def unregister_task(self, task):
        self.tasks.remove(task)

class LocalServer(Server):

    def __init__(self, **kw):
        super(LocalServer, self).__init__(**kw)


class RemoteServer(Server):

    def __init__(self, uri, **kw):
        super(RemoteServer, self).__init__(**kw)
        self.uri = uri
