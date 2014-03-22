# -*- coding: utf-8 -*-

import logging

from abc import ABCMeta
from utils import get_uid, TimelineQueue
from inventory import Inventory
logging.basicConfig(level='DEBUG')


# todo: GEO-index
# todo: fix side effect on edge of tile


class Object(object):
    __metaclass__ = ABCMeta
    __str_template__ = '<{self.__class__.__name__} #{self.id}>'

    def __init__(self, server):
        """
        @type server: model.server.Server
        """
        logging.debug('%s #%d: Create', self.__class__.__name__, self.id)
        super(Object, self).__init__()
        self.server = server
        """@type: model.server.Server"""
        self.uid = get_uid()
        self.server.objects[self.uid] = self

    def __str__(self):
        return self.__str_template__.format(self=self)

    id = property(id)

class PointObject(Object):
    __str_template__ = '<{self.__class__.__name__} #{self.id};{self.position}>'

    def __init__(self, position, **kw):
        """
        @type position: model.vectors.Point
        """
        super(PointObject, self).__init__(**kw)
        self._position = position
        """@type: model.vectors.Point"""

    def get_position(self):
        """
        :rtype: model.vectors.Point
        """
        return self._position

    def set_position(self, position):
        """
        @param model.vectors.Point position: New position
        """
        self._position = position

    position = property(fget=get_position, fset=set_position)

    def delete(self):
        del(self.server.objects[self.uid])


class VisibleObject(PointObject):

    def __init__(self, **kw):
        self.contacts = TimelineQueue()
        """@type: TimelineQueue"""
        super(VisibleObject, self).__init__(**kw)

    def on_change(self):
        # todo: Notify nearest observers
        logging.debug('%s:: changed', self)
        self.contacts_refresh()

    def contacts_refresh(self):
        self.contacts_clear()
        self.contacts_search()

    def contacts_clear(self):
        logging.debug('%s:: contacts clear', self)
        contacts = self.contacts
        while contacts:
            contact = contacts.get()
            self.server.timeline.remove(contact)  # todo: optimize
            if contact.subject != self:
                contact.subject.contacts.remove(contact)
            elif contact.object != self:
                contact.object.contacts.remove(contact)
            del contact

    def special_contacts_search(self):
        logging.debug('%s:: VisibleObject.special_contacts_search', self)
        contacts = self.contacts
        for motion in self.server.filter_motions(None):  # todo: GEO-index clipping
            contacts.extend(motion.contacts_with_static(self))

    def contacts_search(self):
        # todo: rename methods (search->forecast)
        logging.debug('%s:: contacts search', self)
        self.special_contacts_search()
        logging.debug('%s:: contacts found: %s', self, len(self.contacts))
        if self.contacts:
            self.server.timeline.put(self.contacts.head)
            # todo: check for double including one contact into the servers timeline

    def delete(self):
        self.contacts_clear()
        super(VisibleObject, self).delete()


class Heap(VisibleObject):
    """Heap objects thrown on the map"""
    # todo: rearrange class tree
    def __init__(self, items, **kw):
        """
        @type items: list[model.inventory.Thing]
        """
        super(Heap, self).__init__(**kw)
        self.inventory = Inventory(things=items)
        """@type: Inventory"""
        self.server.statics.append(self)

    def delete(self):
        self.server.statics.remove(self)
        del self.inventory
        super(Heap, self).delete()


if __name__ == '__main__':
    pass
