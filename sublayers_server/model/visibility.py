# -*- coding: utf-8 -*-

from base import Object
from collections import Counter

class ManagerVisibility(Object):
    def __init__(self, **kw):
        super(ManagerVisibility, self).__init__(**kw)
        self._visibleObjects = Counter()
        self._observers = set()

    def add_visibleObject(self, visibleObject):
        self._visibleObjects[visibleObject] += 1
        visibleObject._observers.add(self)

    def del_visibleObject(self, visibleObject):
        if self._visibleObjects[visibleObject] >= 0:
            self._visibleObjects[visibleObject] -= 1
            if self._visibleObjects[visibleObject] == 0:
                visibleObject._observers.discard(self)

    def add_observers(self, observer):
        self._observers.add(observer)
        observer._watching.add(self)

    def del_observers(self, observer):
        self._observers.discard(observer)
        observer._watching.discard(self)

    def merge_visibility(self, managerVisibility):
        for observ in managerVisibility._observers:
            self.add_observers(observ)
        for visObj in managerVisibility._visibleObjects:
            self.add_visibleObject(visObj)

    def unit_update(self, update):
        #
        pass

    def delete(self):
        for observ in self._observers:
            self.del_observers(observ)
        for visObj in self._visibleObjects:
            self.del_visibleObject(visObj)