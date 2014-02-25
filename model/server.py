# -*- coding: utf-8 -*-

from utils import get_uid

class Server(object):

    def __init__(self, uid=None):
        self.uid = uid or get_uid()
        self.units = {}
        self.stations = {}
        self.robots = {}


class LocalServer(Server):

    def __init__(self, uid):
        super(LocalServer, self).__init__(uid=uid)


class RemoteServer(Server):

    def __init__(self, uid, uri):
        super(RemoteServer, self).__init__(uid)
        self.uri = uri
