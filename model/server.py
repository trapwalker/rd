# -*- coding: utf-8 -*-

from utils import get_uid
from Queue import PriorityQueue


class Server(object):

    def __init__(self, uid=None):
        self.uid = uid or get_uid()
        self.units = {}
        self.stations = {}
        self.robots = {}
        self.tasklist = PriorityQueue()

    def register_task(self, task):
        pass

    def register_object(self, obj):
        pass

    def register_unit(self, unit):
        pass

    def register_observer(self, observer):
        pass


class LocalServer(Server):

    def __init__(self, **kw):
        super(LocalServer, self).__init__(**kw)


class RemoteServer(Server):

    def __init__(self, uri, **kw):
        super(RemoteServer, self).__init__(**kw)
        self.uri = uri
