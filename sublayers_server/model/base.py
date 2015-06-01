# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

#from utils import get_uid, serialize
from sublayers_server.model import messages
from sublayers_server.model.events import Init, Delete
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

    def __init__(self, server, time):
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

    def delete(self, time):
        Delete(obj=self, time=time).post()

    id = property(id)
    memsize = sys.getsizeof

    @property
    def classname(self):
        return self.__class__.__name__

    @property
    def dead_mark(self):
        return '' if self.is_alive else '~'

    def as_dict(self, time):
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
        super(PointObject, self).__init__(**kw)
        self._position = position
        self.server.geo_objects.append(self)

    def on_after_delete(self, event):
        self.server.geo_objects.remove(self)
        super(PointObject, self).on_after_delete(event=event)

    def as_dict(self, time):
        d = super(PointObject, self).as_dict(time=time)
        d.update(position=self.position(time=time))
        return d

    def position(self, time):
        return self._position


class VisibleObject(PointObject):
    """Observers subscribes to VisibleObject updates.
    """
    def __init__(self, time, visibility=1.0, **kw):
        super(VisibleObject, self).__init__(time=time, **kw)
        self.params = dict()
        self.set_default_params()

        Parameter(original=visibility, name='p_visibility', owner=self)

        self.subscribed_agents = CounterSet()
        self.subscribed_observers = []
        Init(obj=self, time=time).post()
        # работа с тегами
        self.tags = set()
        self.set_default_tags()

    def on_init(self, event):
        super(VisibleObject, self).on_init(event)
        self.server.visibility_mng.add_object(obj=self, time=event.time)

    def on_update(self, event):  # todo: privacy level index
        for agent in self.subscribed_agents:
            messages.Update(
                agent=agent,
                time=event.time,
                obj=self,
                comment=event.comment
            ).post()

    def get_params_dict(self):
        res = dict()
        for p in self.params.values():
            res.update({p.name: p.value})
        return res

    def on_before_delete(self, event):
        subscribed_observers = self.subscribed_observers[:]
        for obs in subscribed_observers:
            obs.on_contact_out(time=event.time, obj=self)
        self.server.visibility_mng.del_object(obj=self, time=event.time)
        super(VisibleObject, self).on_before_delete(event=event)

    @property
    def main_unit(self):
        return self

    def set_default_tags(self):
        pass

    def set_default_params(self):
        for d in BALANCE.default_resists:
            Parameter(owner=self, **d)
        for d in BALANCE.default_modifiers:
            Parameter(owner=self, **d)


class Observer(VisibleObject):

    def __init__(self, observing_range=BALANCE.Observer.observing_range, **kw):
        super(Observer, self).__init__(**kw)
        Parameter(original=observing_range, max_value=10000.0, name='p_observing_range', owner=self)
        self.watched_agents = CounterSet()
        self.visible_objects = []

    def on_contact_in(self, time, obj):
        self.visible_objects.append(obj)
        obj.subscribed_observers.append(self)
        # add all subscribed _agents_ into to the _visible object_
        for agent in self.watched_agents:
            for i in range(self.watched_agents[agent]):
                agent.on_see(time=time, subj=self, obj=obj)

    def on_contact_out(self, time, obj):
        for agent in self.watched_agents:
            for i in range(self.watched_agents[agent]):
                agent.on_out(time=time, subj=self, obj=obj)
        self.visible_objects.remove(obj)
        obj.subscribed_observers.remove(self)

    def on_before_delete(self, event):
        # развидеть все объекты, которые были видны
        visible_objects = self.visible_objects[:]
        for vo in visible_objects:
            self.on_contact_out(time=event.time, obj=vo)

        # перестать отправлять агентам сообщения
        for agent in self.watched_agents:
            log.debug('Warning !!! Try to drop observer for agent %s', agent)
            agent.drop_observer(self)

        super(Observer, self).on_before_delete(event=event)

    @property
    def r(self):
        return self.params.get('p_observing_range').value

    def as_dict(self, time):
        d = super(Observer, self).as_dict(time=time)
        d.update(r=self.r)
        return d

    def on_die(self, event):
        pass

