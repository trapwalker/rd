# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

#from utils import get_uid, serialize
from sublayers_server.model import messages
from sublayers_server.model.events import Init, Delete, SearchContacts
from sublayers_server.model.parameters import Parameter
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.stat_log import StatLogger

import sys
from abc import ABCMeta
from counterset import CounterSet
from functools import update_wrapper

# todo: GEO-index
# todo: fix side effect on edge of tile


class Object(object):
    __metaclass__ = ABCMeta
    __str_template__ = '<{self.dead_mark}{self.classname} #{self.id}>'

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
        self.stat_log = StatLogger(owner=self)

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
        assert len(self.events) == 0
        del self.server.objects[self.uid]
        # log.debug('Finally deletion: %s', self)

    def delete(self, time=None):
        Delete(obj=self, time=time).post()

    id = property(id)
    memsize = sys.getsizeof

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

    @property
    def is_frag(self):
        return False


class PointObject(Object):
    __str_template__ = '<{self.dead_mark}{self.classname} #{self.id}>'

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
    def __init__(self, visibility=1.0, **kw):
        super(VisibleObject, self).__init__(**kw)
        self.p_visibility = Parameter(original=visibility)
        self.subscribed_agents = CounterSet()
        self.subscribed_observers = []
        self.contacts_check_interval = None  # todo: extract to special task
        Init(obj=self).post()
        # работа с тегами
        self.tags = set()
        self.set_default_tags()

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
                comment=event.comment
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
        time = self.server.get_time()
        subscribed_observers = self.subscribed_observers[:]
        for obs in subscribed_observers:
            obs.on_contact_out(time=time, obj=self)
        super(VisibleObject, self).on_before_delete(event=event)

    @property
    def main_unit(self):
        return self

    def set_default_tags(self):
        pass


class Observer(VisibleObject):

    def __init__(self, observing_range=BALANCE.Observer.observing_range, **kw):
        self.p_observing_range = Parameter(original=observing_range, max_value=10000.0)
        super(Observer, self).__init__(**kw)
        self.watched_agents = CounterSet()
        self.visible_objects = []

    def contact_test(self, obj):
        """Test to contacts between *self* and *obj*, append them if is."""
        # todo: test to time
        can_see = self.can_see(obj)
        see = obj in self.visible_objects
        if can_see != see:
            if can_see:
                self.on_contact_in(time=self.server.get_time(), obj=obj)
            else:
                self.on_contact_out(time=self.server.get_time(), obj=obj)

    def can_see(self, obj):
        assert not self.limbo
        assert not obj.limbo
        dist = abs(self.position - obj.position)
        return dist <= (self.p_observing_range.value * obj.p_visibility.value)

    # todo: check calls

    def on_contact_in(self, time, obj, is_boundary=False, comment=None):
        """
        @param float time: contact time
        @param VisibleObject obj: contacted object
        @param bool is_boundary: True if this contact is visible range penetration
        @param str comment: debug comment
        """
        self.visible_objects.append(obj)
        obj.subscribed_observers.append(self)
        # add all subscribed _agents_ into to the _visible object_
        for agent in self.watched_agents:
            for i in range(self.watched_agents[agent]):
                agent.on_see(time=time, subj=self, obj=obj, is_boundary=is_boundary)

    # todo: check calls
    def on_contact_out(self, time, obj, is_boundary=False, comment=None):
        """
        @param float time: contact time
        @param VisibleObject obj: contacted object
        @param bool is_boundary: True if this contact is visible range penetration
        @param str comment: debug comment
        """
        # remove all subscribed _agents_ from _visible object_
        for agent in self.watched_agents:
            for i in range(self.watched_agents[agent]):
                agent.on_out(time=time, subj=self, obj=obj, is_boundary=is_boundary)

        self.visible_objects.remove(obj)
        obj.subscribed_observers.remove(self)

    def on_before_delete(self, event):
        # развидеть все объекты, которые были видны
        time = self.server.get_time()
        visible_objects = self.visible_objects[:]
        for vo in visible_objects:
            self.on_contact_out(time=time, obj=vo)

        # перестать отправлять агентам сообщения
        for agent in self.watched_agents:
            log.debug('Warning !!! Try to drop observer for agent %s', agent)
            agent.drop_observer(self)

        super(Observer, self).on_before_delete(event=event)

    @property
    def r(self):
        return self.p_observing_range.value

    def as_dict(self, **kw):
        d = super(Observer, self).as_dict(**kw)
        d.update(r=self.r)
        return d

    def on_die(self, event):
        pass

