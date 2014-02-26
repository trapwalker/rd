# -*- coding: utf-8 -*-

from base import VisibleObject, Stationary, Observer


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


class Station(Unit, Stationary):
    u'''Class of buildings'''

    def __init__(self, **kw):
        super(Station, self).__init__(**kw)


class Bot(Unit):
    u'''Class of mobile units'''

    def __init__(self, **kw):
        print kw
        super(Bot, self).__init__(**kw)
