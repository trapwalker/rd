# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from subscription_protocol import make_subscriber_emitter_classes
from utils import get_uid, serialize
from inventory import Inventory
import messages
from events import ContactSee

from abc import ABCMeta

# todo: GEO-index
# todo: fix side effect on edge of tile


SubscriberTo__VisibleObject, EmitterFor__Observer = make_subscriber_emitter_classes(
    subscriber_name='Observer',
    emitter_name='VisibleObject')

SubscriberTo__Observer, EmitterFor__Agent = make_subscriber_emitter_classes(
    subscriber_name='Agent',
    emitter_name='Observer')


class Object(object):
    __metaclass__ = ABCMeta
    __str_template__ = '<{self.dead_mark}{self.__class__.__name__} #{self.id}>'

    def __init__(self, server):
        """
        @type server: model.server.Server
        """
        super(Object, self).__init__()
        self.server = server
        """@type: model.server.Server"""
        self.uid = id(self)
        self.server.objects[self.uid] = self
        self.is_alive = True

    def __str__(self):
        return self.__str_template__.format(self=self)

    def delete(self):
        self.is_alive = False
        del self.server.objects[self.uid]

    id = property(id)

    @property
    def classname(self):
        return self.__class__.__name__

    @property
    def dead_mark(self):
        return '' if self.is_alive else '~'

    def as_dict(self):
        return dict(
            cls=self.classname,
            uid=self.uid,
        )

    def serialize(self):
        return serialize(self.as_dict())


class PointObject(Object):
    __str_template__ = '<{self.dead_mark}{self.__class__.__name__} #{self.id};{self.position}>'

    def __init__(self, position, **kw):
        """
        @type position: model.vectors.Point
        """
        super(PointObject, self).__init__(**kw)
        self._position = position
        """@type: model.vectors.Point"""

    def as_dict(self):
        d = super(PointObject, self).as_dict()
        d.update(position=self.position)
        return d

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


class VisibleObject(PointObject, EmitterFor__Observer):
    """Observers subscribes to VisibleObject updates.
    """

    def __init__(self, **kw):
        self.contacts = []
        """@type: list[model.events.Contact]"""
        super(VisibleObject, self).__init__(**kw)
        self.init_contacts_search()

    def on_change(self):  # todo: privacy level index
        # todo: emit update message
        self.contacts_refresh()
        self.emit_for__Observer()  # todo: arguments?

    def contacts_refresh(self):
        self.contacts_clear()
        self.contacts_search()

    def contacts_clear(self):
        contacts = self.contacts
        while contacts:
            contacts.pop().actual = False

    def init_contacts_search(self):
        contacts = self.contacts
        for obj in self.server.filter_statics(None):  # todo: GEO-index clipping
            if isinstance(obj, Observer) and obj is not self:  # todo: optimize filtration observers
                dist = abs(obj.position - self.position)
                if dist <= obj.r:  # todo: check <= vs <
                    contacts.append(ContactSee(time=self.server.get_time(), subj=obj, obj=self))

        self.contacts_search()
        log.debug('INIT VO %s: found %d contacts', self, len(contacts))

    def special_contacts_search(self):
        contacts = self.contacts
        for motion in self.server.filter_motions(None):  # todo: GEO-index clipping
            found = motion.contacts_with_static(self)
            if found:
                contacts.extend(found)
                motion.owner.contacts.extend(found)

    def contacts_search(self):
        # todo: rename methods (search->forecast)
        self.special_contacts_search()
        self.server.post_events(self.contacts)
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


class Observer(VisibleObject, SubscriberTo__VisibleObject, EmitterFor__Agent):

    def __init__(self, observing_range=0.0, **kw):
        self._r = observing_range
        super(Observer, self).__init__(**kw)
        # todo: Нужно увидеть соседние объекты при инициализации

    def on_change(self):
        super(Observer, self).on_change()
        self.emit_for__Agent(message=messages.Update(subject=self, obj=self, comment='message for owner'))

    def on_event_from__VisibleObject(self, emitter, *av, **kw):
        self.emit_for__Agent(message=messages.Update(subject=self, obj=emitter, comment='message from VO (emitter)'))

    @property
    def r(self):
        return self._r

    def as_dict(self):
        d = super(Observer, self).as_dict()
        d.update(r=self.r)
        return d

    def init_contacts_search(self):
        # todo: need to refactorig
        contacts = self.contacts
        for obj in self.server.filter_statics(None):  # todo: GEO-index clipping
            if isinstance(obj, VisibleObject) and obj is not self:  # todo: optimize filtration VisibleObkects
                dist = abs(obj.position - self.position)

                if dist <= self.r:
                    contacts.append(ContactSee(time=self.server.get_time(), subj=self, obj=obj))

                if isinstance(obj, Observer) and dist <= obj.r:  # todo: check <= vs <
                    contacts.append(ContactSee(time=self.server.get_time(), subj=obj, obj=self))

        self.contacts_search()
        log.debug('INIT OBSERVER %s: found %d contacts', self, len(contacts))
