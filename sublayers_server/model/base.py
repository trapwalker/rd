# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

#from utils import get_uid, serialize
from inventory import Inventory
import messages
from events import ContactSee, ContactOut, Init, Delete, SearchContacts
from parameters import Parameter
from balance import BALANCE

from abc import ABCMeta
from counterset import CounterSet
from functools import update_wrapper

# todo: GEO-index
# todo: fix side effect on edge of tile


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
        self.limbo = False

    def __hash__(self):
        return self.uid

    def __str__(self):
        return self.__str_template__.format(self=self)

    def on_init(self, event):
        pass

    def on_before_delete(self, event):
        for ev in self.events[:]:
            ev.cancel()
        assert len(self.events) == 0

    def on_after_delete(self, event):
        if self.events:
            log.error('Events after deletion: %s', self.events)
        assert len(self.events) == 0  # todo: set 2 phase of deletion as last event
        del self.server.objects[self.uid]
        self.is_alive = False
        log.debug('Finally deletion: %s', self)

    def delete(self, time=None):
        Delete(obj=self, time=time).post()

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
        super(VisibleObject, self).__init__(**kw)
        self.subscribed_agents = CounterSet()
        self.subscribed_observers = []
        self.contacts_check_interval = None  # todo: extract to special task
        Init(obj=self).post()

    def on_init(self, event):
        super(VisibleObject, self).on_init(event)
        SearchContacts(obj=self).post()

    def on_update(self, event):  # todo: privacy level index
        self.on_contacts_check()  # todo: (!) Не обновлять контакты если изменения их не затрагивают
        for agent in self.subscribed_agents:
            messages.Update(
                agent=agent,
                time=event.time,
                obj=self,
            ).post()

    def on_contacts_check(self):
        # todo: check all existed contacts
        if self.limbo:
            log.warning('Trying to check contacts in limbo: subj=%s', self)
            return
        for obj in self.server.geo_objects:  # todo: GEO-index clipping
            if obj is not self and not obj.limbo:  # todo: optimize filtration observers
                self.contact_test(obj)
                obj.contact_test(self)  # todo: optimize forecasts

    def contact_test(self, obj):
        """Test to contacts between *self* and *obj*, append them if is."""
        pass

    def on_before_delete(self, event):
        # todo: test to subscription leaks
        super(VisibleObject, self).on_before_delete(event=event)
        for obs in self.subscribed_observers:
            if not obs.limbo:
                ContactOut(subj=obs, obj=self).post()

    def on_after_delete(self, event):
        # todo: checkit
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

    def __init__(self, observing_range=BALANCE.Observer.observing_range, **kw):
        self._r = observing_range
        self.p_r = Parameter(original=observing_range)
        super(Observer, self).__init__(**kw)
        self.watched_agents = CounterSet()
        self.visible_objects = []

    def contact_test(self, obj):
        """Test to contacts between *self* and *obj*, append them if is."""
        # todo: test to time
        can_see = self.can_see(obj)
        see = obj in self.visible_objects
        if can_see != see:
            (ContactSee if can_see else ContactOut)(time=self.server.get_time(), subj=self, obj=obj).post()
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
            messages.See(
                agent=agent,
                time=time,
                subj=self,
                obj=obj,
                is_boundary=is_boundary,
                is_first=is_first,
            ).post()

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
            messages.Out(
                agent=agent,
                time=time,
                subj=self,
                obj=obj,
                is_boundary=is_boundary,
                is_last=is_last,
            ).post()

        self.visible_objects.remove(obj)
        obj.subscribed_observers.remove(self)

    @property
    def r(self):
        return self._r

    def as_dict(self, **kw):
        d = super(Observer, self).as_dict(**kw)
        d.update(r=self.r)
        return d

    def on_die(self, event):
        # todo: перенести в более правильное место. Временно тут!
        for agent in self.watched_agents:
            messages.Die(
                agent=agent
            ).post()
