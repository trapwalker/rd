# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

#from utils import get_uid, serialize
from inventory import Inventory
import messages
from events import ContactSee

from abc import ABCMeta
from counterset import CounterSet

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
        self.is_alive = True

    def __hash__(self):
        return self.uid

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
        # todo: 'delete' method fix
        self.init_contacts_search()

    def on_update(self, time, comment=None):  # todo: privacy level index
        self.contacts_refresh()  # todo: (!) Не обновлять контакты если изменения их не затрагивают
        for agent in self.subscribed_agents:
            agent.send_update(messages.Update(
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
            assert (
                motion.start_time is not None
                and motion.duration is not None
                and motion.is_started
            )
            motion.detect_contacts_with_static(self)

    def contacts_search(self):
        # todo: rename methods (search->forecast)
        self.special_contacts_search()

    def delete(self):
        self.contacts_clear()
        # todo: send 'out' message for all subscribers
        # todo: test to subscription leaks
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
        self.inventory = None
        super(Heap, self).delete()


class Observer(VisibleObject):

    def __init__(self, observing_range=0.0, **kw):
        self._r = observing_range
        super(Observer, self).__init__(**kw)
        self.watched_agents = CounterSet()
        self.visible_objects = []
        self.server.statics.append(self)
        self.server.static_observers.append(self)

    def init_contact_test(self, obj):
        """Override test to contacts between *self* and *obj*, append them if is."""
        super(Observer, self).init_contact_test(obj)
        if self.can_see(obj):
            ContactSee(time=self.server.get_time(), subj=self, obj=obj).send()

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
            agent.send_contact(messages.See(time=time, subj=self, obj=obj, is_boundary=is_boundary, is_first=is_first))

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
            agent.send_contact(messages.Out(time=time, subj=self, obj=obj, is_boundary=is_boundary, is_last=is_last))

        self.visible_objects.remove(obj)
        obj.subscribed_observers.remove(self)

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

    def as_dict(self, **kw):
        d = super(Observer, self).as_dict(**kw)
        d.update(r=self.r)
        return d
