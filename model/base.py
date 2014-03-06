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
        self.server.objects[self.uid] = self

    def get_position(self):
        """
        :rtype : :class:`vectors.Point`
        """
        return self._position

    def set_position(self, position):
        self._position = position

    position = property(fget=get_position, fset=set_position)

    def delete(self):
        del(self.server.objects[self.uid])


class VisibleObject(PointObject):

    def __init__(self, **kw):
        self.contacts = TimelineQueue()
        super(VisibleObject, self).__init__(**kw)

    def on_change(self):
        # todo: Notify nearest observers
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

    def special_contacts_search(self):
        contacts = self.contacts
        for motion in self.server.filter_motions(None):  # todo: GEO-index clipping
            contacts.extend(motion.contacts_with_static(self))

    def contacts_search(self):
        self.special_contacts_search()
        if self.contacts:
            self.server.timeline.put(self.contacts.head)

    def delete(self):
        self.contacts_clear()
        super(VisibleObject, self).delete()

class Heap(VisibleObject):
    u"""Heap objects thrown on the map"""
    # todo: rearrange class tree
    def __init__(self, items, **kw):
        super(Heap, self).__init__(**kw)
        self.inventory = Inventory(things=items)
        self.server.statics.append(self)

    def delete(self):
        self.server.statics.remove(self)
        super(Heap, self).delete()


if __name__ == '__main__':
    pass
