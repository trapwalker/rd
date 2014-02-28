# -*- coding: utf-8 -*-

import logging

from abc import ABCMeta, abstractmethod
from utils import get_uid, TimelineQueue
from inventory import Inventory
logging.basicConfig(level='DEBUG')


# todo: class Task
# todo: class Collision
# todo: GEO-index
# todo: fix side effect on edge of tile


class PointObject(object):
    __metaclass__ = ABCMeta

    def __init__(self, position):
        super(PointObject, self).__init__()
        self._position = position

    @abstractmethod
    def is_static(self):
        pass

    def get_position(self):
        return None

    position = property(fget=get_position)


class VisibleObject(PointObject):

    def __init__(self, server, **kw):
        self.server = server
        self.uid = get_uid()
        self.contacts = TimelineQueue()
        super(VisibleObject, self).__init__(**kw)

    def register(self, server):
        #super(VisibleObject, self).register(server)
        logging.debug('Register: %s', self.__class__.__name__)

    def on_change(self):
        self.contacts_refresh()

    def contacts_refresh(self):
        self.contacts_clear()
        self.contacts_search()

    def contacts_clear(self):
        contacts = self.contacts
        while contacts:
            contact = contacts.get()
            if contact.subject != self:
                contact.subject.contacts.remove(contact)
            elif contact.object != self:
                contact.object.contacts.remove(contact)
            del(contact)

    def contacts_search(self):
        # toto: make
        pass


class Stationary(PointObject):
    u"""Mixin for stationary objects"""

    def is_static(self):
        return True

    def get_position(self):
        return self._position


class Heap(VisibleObject, Stationary):
    u"""Heap objects thrown on the map"""
    # todo: rearrange class tree
    def __init__(self, items, **kw):
        super(Heap, self).__init__(**kw)
        self.inventory = Inventory(things=items)


if __name__ == '__main__':
    pass
