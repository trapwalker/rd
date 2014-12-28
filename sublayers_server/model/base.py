# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

#from utils import get_uid, serialize
from inventory import Inventory
import messages
from events import ContactSee, ContactOut, Init, Delete, Callback

from abc import ABCMeta
from counterset import CounterSet
from functools import update_wrapper

# todo: GEO-index
# todo: fix side effect on edge of tile


def async_call(method):
    def cover(self, time=None, **kw):
        def async_closure(event):
            log.debug('async_closure: kw=%r', kw)
            return method(self, time=event.time, **kw)

        Callback(server=self.server, time=time, func=async_closure).send()
    update_wrapper(cover, method)
    return cover


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
        self.events = []  # all events about this object
        self.is_alive = True

    def __hash__(self):
        return self.uid

    def __str__(self):
        return self.__str_template__.format(self=self)

    def on_before_delete(self, event):
        pass

    def on_after_delete(self, event):
        for event in self.events[:]:
            event.cancel()
        del self.server.objects[self.uid]
        self.is_alive = False
        log.debug('Finally deletion: %s', self)

    def delete(self, time=None):
        Delete(obj=self, time=time).send()

    id = property(id)

    @property
    def classname(self):
        return self.__class__.__name__

    @property
    def dead_mark(self):
        return '' if self.is_alive else '~'

    def as_dict(self, to_time=None):
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
        self.server.geo_objects.append(self)

    def on_after_delete(self, event):
        self.server.geo_objects.remove(self)
        super(PointObject, self).on_after_delete(event=event)

    def as_dict(self, **kw):
        d = super(PointObject, self).as_dict(**kw)
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


class VisibleObject(PointObject):
    """Observers subscribes to VisibleObject updates.
    """
    def __init__(self, **kw):
        self.contacts = []
        """@type: list[sublayers_server.model.events.Contact]"""
        super(VisibleObject, self).__init__(**kw)
        self.subscribed_agents = CounterSet()
        self.subscribed_observers = []
        Init(obj=self).send()

    def on_update(self, time, comment=None):  # todo: privacy level index
        # todo: get event in params
        self.contacts_refresh()  # todo: (!) Не обновлять контакты если изменения их не затрагивают
        for agent in self.subscribed_agents:
            agent.server.post_message(messages.Update(
                agent=agent,
                time=time,
                obj=self,
                comment='message for subscriber: {}'.format(comment)
            ))

    def contacts_refresh(self):
        self.contacts_clear()
        self.contacts_search()

    def contacts_clear(self):
        for event in self.contacts[:]:
            event.cancel()

    def contacts_search(self):
        # todo: rename methods (search->forecast)
        for obj in self.server.geo_objects:  # todo: GEO-index clipping
            if obj is not self:  # todo: optimize filtration observers
                self.contact_test(obj)
                obj.contact_test(self)  # todo: optimize forecasts

    def contact_test(self, obj):
        """Test to contacts between *self* and *obj*, append them if is."""
        pass

    def on_before_delete(self, event):
        # todo: send 'out' message for all subscribers (!)
        # todo: test to subscription leaks
        for obs in self.subscribed_observers:
            ContactOut(subj=obs, obj=self).send()
        super(VisibleObject, self).on_before_delete(event=event)

    def on_after_delete(self, event):
        # todo: check contact list is empty
        self.contacts_clear()
        super(VisibleObject, self).on_after_delete(event=event)


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

    def on_after_delete(self, event):
        self.inventory = None
        super(Heap, self).on_after_delete(event=event)


class Observer(VisibleObject):

    def __init__(self, observing_range=0.0, **kw):
        self._r = observing_range
        super(Observer, self).__init__(**kw)
        self.watched_agents = CounterSet()
        self.visible_objects = []

    def contact_test(self, obj):
        """Test to contacts between *self* and *obj*, append them if is."""
        # todo: test to time
        can_see = self.can_see(obj)
        see = obj in self.visible_objects
        if can_see != see:
            (ContactSee if can_see else ContactOut)(time=self.server.get_time(), subj=self, obj=obj).send()
            return

    def can_see(self, obj):
        """
        @type obj: VisibleObject
        """
        dist = abs(self.position - obj.position)
        return dist <= self._r  # todo: check <= vs <
        # todo: Расчет видимости с учетом маскировки противника

    # todo: check calls
    def on_contact_in(self, time, obj, is_boundary, comment=None):
        """
        @param float time: contact time
        @param VisibleObject obj: contacted object
        @param bool is_boundary: True if this contact is visible range penetration
        @param str comment: debug comment
        """
        self.visible_objects.append(obj)
        obj.subscribed_observers.append(self)
        # add all subscribed _agents_ into to the _visible object_
        # vo.subscribed_agents.update(self.watched_agents)  # todo: may be optimize
        for agent in self.watched_agents:
            is_first = obj.subscribed_agents.inc(agent) == 1
            self.server.post_message(messages.See(
                agent=agent,
                time=time,
                subj=self,
                obj=obj,
                is_boundary=is_boundary,
                is_first=is_first,
            ))

    # todo: check calls
    def on_contact_out(self, time, obj, is_boundary, comment=None):
        """
        @param float time: contact time
        @param VisibleObject obj: contacted object
        @param bool is_boundary: True if this contact is visible range penetration
        @param str comment: debug comment
        """
        # remove all subscribed _agents_ from _visible object_
        # vo.subscribed_agents.subtract(self.watched_agents)  # todo: may be optimize
        for agent in self.watched_agents:
            is_last = obj.subscribed_agents.dec(agent) == 0
            self.server.post_message(messages.Out(
                agent=agent,
                time=time,
                subj=self,
                obj=obj,
                is_boundary=is_boundary,
                is_last=is_last,
            ))

        self.visible_objects.remove(obj)
        obj.subscribed_observers.remove(self)

    @property
    def r(self):
        return self._r

    def as_dict(self, **kw):
        d = super(Observer, self).as_dict(**kw)
        d.update(r=self.r)
        return d

    def on_before_delete(self, event):
        for obj in self.visible_objects:
            ContactOut(subj=self, obj=obj).send()
        super(Observer, self).on_before_delete(event=event)
