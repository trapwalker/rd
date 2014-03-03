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

    def __init__(self, server, position):
        super(PointObject, self).__init__()
        self.server = server
        self.uid = get_uid()
        self._position = position

    @abstractmethod
    def is_static(self):
        """Stationary/mobile status of object.
        :rtype : bool
        :returns: True if object is stationary in this time
        """
        pass

    def get_position(self):
        """
        :rtype : :class:`vectors.Point`
        """
        return self._position

    position = property(fget=get_position)

    def register(self):
        logging.debug('Register: %s', self.__class__.__name__)
        self.server.objects[self.uid] = self

    def unregister(self):
        del(self.server.objects[self.uid])


class VisibleObject(PointObject):

    def __init__(self, **kw):
        self.contacts = TimelineQueue()
        super(VisibleObject, self).__init__(**kw)

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

    def stationary_contacts_search(self):
        pass

    def contacts_search(self):
        self.stationary_contacts_search()


class Stationary(PointObject):
    u"""Mixin for stationary objects"""

    def is_static(self):
        return True

    def get_position(self):
        return self._position

    def register(self):
        super(Stationary, self).register()
        self.server.statics.append(self)

    def unregister(self):
        super(Stationary, self).unregister()
        self.server.statics.remove(self)


class Heap(VisibleObject, Stationary):
    u"""Heap objects thrown on the map"""
    # todo: rearrange class tree
    def __init__(self, items, **kw):
        super(Heap, self).__init__(**kw)
        self.inventory = Inventory(things=items)


if __name__ == '__main__':
    pass
