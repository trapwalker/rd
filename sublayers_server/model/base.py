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
        @type server: sublayers_server.model.event_machine.Server
        """
        super(Object, self).__init__()
        self.server = server
        """@type: sublayers_server.model.event_machine.Server"""
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


class PointObject(Object):
    __str_template__ = '<{self.dead_mark}{self.__class__.__name__} #{self.id}>'

    def __init__(self, position, **kw):
        """
        @type position: sublayers_server.model.vectors.Point
        """
        super(PointObject, self).__init__(**kw)
        self._position = position
        """@type: sublayers_server.model.vectors.Point"""

    def as_dict(self):
        d = super(PointObject, self).as_dict()
        d.update(position=self.position)
        return d

    @property
    def position(self):
        """
        :rtype: model.vectors.Point
        """
        return self._position

    @position.setter
    def position(self, position):
        """
        @param sublayers_server.model.vectors.Point position: New position
        """
        self._position = position


class VisibleObject(PointObject, EmitterFor__Observer):
    """Observers subscribes to VisibleObject updates.
    """

    def __init__(self, **kw):
        self.contacts = []
        """@type: list[sublayers_server.model.events.Contact]"""
        super(VisibleObject, self).__init__(**kw)
        self.init_contacts_search()

    def on_change(self, comment=None):  # todo: privacy level index
        # todo: emit update message
        self.contacts_refresh()  # todo: (!) Не обновлять контакты если изменения их не затрагивают
        self.emit_for__Observer()  # todo: arguments?

    def contacts_refresh(self):
        self.contacts_clear()
        self.contacts_search()

    def contacts_clear(self):
        for event in self.contacts[:]:
            event.cancel()

    def init_contact_test(self, obj):
        """Test to contacts between *self* and *obj*, append them if is."""
        if obj.can_see(self):
            ContactSee(time=self.server.get_time(), subj=obj, obj=self).send()

    def init_contacts_search(self):
        """Search init contacts"""
        for obj in self.server.filter_objects(None):  # todo: GEO-index clipping
            if isinstance(obj, Observer) and obj is not self:  # todo: optimize filtration observers
                self.init_contact_test(obj)

        self.contacts_search()  # todo: Устранить потенциальное дублирование контакта, если он окажетя на границе

    def special_contacts_search(self):
        for motion in self.server.filter_motions(None):  # todo: GEO-index clipping
            motion.detect_contacts_with_static(self)

    def contacts_search(self):
        # todo: rename methods (search->forecast)
        self.special_contacts_search()

    def delete(self):
        self.contacts_clear()
        super(VisibleObject, self).delete()


class Heap(VisibleObject):
    """Heap objects thrown on the map"""
    # todo: rearrange class tree
    def __init__(self, items, **kw):
        """
        @type items: list[sublayers_server.model.inventory.Thing]
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

    def init_contact_test(self, obj):
        """Override test to contacts between *self* and *obj*, append them if is."""
        super(Observer, self).init_contact_test(obj)
        if self.can_see(obj):
            ContactSee(time=self.server.get_time(), subj=self, obj=obj).send()

    def on_change(self, comment=None):
        super(Observer, self).on_change(comment)
        self.emit_for__Agent(
            message=messages.Update(subject=self, obj=self, comment='message for owner: {}'.format(comment))
        )

    def on_event_from__VisibleObject(self, emitter, *av, **kw):
        self.emit_for__Agent(message=messages.Update(subject=self, obj=emitter, comment='message from VO (emitter)'))

    @property
    def r(self):
        return self._r

    def can_see(self, obj):
        """
        @type obj: VisibleObject
        """
        dist = abs(self.position - obj.position)
        return dist <= self._r  # todo: check <= vs <
        # todo: Расчет видимости с учетом маскировки противника

    def as_dict(self):
        d = super(Observer, self).as_dict()
        d.update(r=self.r)
        return d
