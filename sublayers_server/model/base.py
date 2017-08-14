# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

# from utils import get_uid, serialize
from sublayers_server.model import messages
from sublayers_server.model.events import Init, Delete, Save
from sublayers_server.model.parameters import Parameter

import sys
from abc import ABCMeta
from counterset import CounterSet
from uuid import uuid1 as get_uid

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
        self.uid = self.id = str(get_uid())
        self.server.objects[self.uid] = self
        self.events = []  # all events about this object
        self.is_alive = True
        self.limbo = False

    def __hash__(self):
        return hash(self.uid)

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

    def on_save(self, time):
        pass

    def save(self, time):
        Save(obj=self, time=time).post()

    def delete(self, time):
        Delete(obj=self, time=time).post()

    #id = property(id)
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

    def __init__(self, example, position=None, **kw):
        super(PointObject, self).__init__(**kw)
        self._position = example.position and example.position.as_point() or position
        self.example = example
        if example is None:
            log.warning('Object %s has no example node', self)
        else:
            self._param_aggregate = self.example.param_aggregate(example_agent=getattr(self, 'owner_example', None))
        self.server.geo_objects.append(self)

    def on_after_delete(self, event):
        self.server.geo_objects.remove(self)
        super(PointObject, self).on_after_delete(event=event)

    def on_save(self, time):
        self.example.position = self.position(time)

    def as_dict(self, time):
        d = super(PointObject, self).as_dict(time=time)
        d.update(position=self.position(time=time))
        return d

    def position(self, time):
        return self._position

    def displace(self, time):  # раздеплоивание объекта с карты
        if self.example is not None:  # todo: в example добавить флаг необходимости сохранения
            self.save(time=time)
        self.delete(time)


class VisibleObject(PointObject):
    """Observers subscribes to VisibleObject updates.
    """
    # todo: внести visibility в реестровую ветку MapLocations
    def __init__(self, time, **kw):
        super(VisibleObject, self).__init__(time=time, **kw)
        self.params = dict()
        self.set_default_params()

        Parameter(original=self._param_aggregate['p_visibility_min'],
                  name='p_visibility_min',
                  owner=self,)  # min_value=0.0, max_value=1.0)
        Parameter(original=self._param_aggregate['p_visibility_max'],
                  name='p_visibility_max',
                  owner=self,)  # min_value=0.0, max_value=1.0)

        self.subscribed_agents = CounterSet()
        self.subscribed_observers = []
        Init(obj=self, time=time).post()
        # работа с тегами
        self.tags = set()
        self.set_default_tags()

    def get_visibility(self, time):
        visibility_min = self.params.get('p_visibility_min').value
        visibility_max = self.params.get('p_visibility_max').value
        value = (visibility_min + visibility_max) / 2.0
        # assert 0 <= value <= 1, 'value={}'.format(value)
        if not (0 <= value <= 1):
            log.debug('Error!!! get_visibility !!!')
            log.debug('value={} vis_min={} vis_max={}, time={} vo={}'.format(value, visibility_min, visibility_max, time, self))
            self.server.stop()
        return value

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
        for name, attr, getter in self.example.iter_attrs(tags='parameter p_modifier'):
            Parameter(
                original=self._param_aggregate[name],
                name=name,
                owner=self,
            )
        for name, attr, getter in self.example.iter_attrs(tags='parameter p_resist'):
            Parameter(
                original=self._param_aggregate[name],
                name=name,
                max_value=1.0,
                owner=self,
            )

    def add_to_chat(self, chat, time):
        pass

    def del_from_chat(self, chat, time):
        pass

    def can_see_me(self, subj, time, obj_pos=None, subj_pos=None):
        return True


class Observer(VisibleObject):
    def __init__(self, time, **kw):
        super(Observer, self).__init__(time=time, **kw)
        Parameter(original=self._param_aggregate['p_observing_range'],
                  name='p_observing_range',
                  owner=self)
        Parameter(original=self._param_aggregate['p_vigilance'],
                  name='p_vigilance',
                  owner=self)
        self.watched_agents = CounterSet()
        self.visible_objects = []

        # обновляем статистику сервера
        server_stat = self.server.stat_log
        server_stat.s_observers_all(time=time, delta=1.0)
        server_stat.s_observers_on(time=time, delta=1.0)

    def get_observing_range(self, time):
        return self.params.get('p_observing_range').value

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

        # обновляем статистику по живым юнитам
        self.server.stat_log.s_observers_on(time=event.time, delta=-1.0)

        super(Observer, self).on_before_delete(event=event)

    def as_dict(self, time):
        d = super(Observer, self).as_dict(time=time)
        d.update(p_observing_range=self.get_observing_range(time=time))
        return d

    def on_die(self, event):
        pass

    def upd_observing_range(self, time):
        pass

    def can_see_me(self, subj, time, obj_pos=None, subj_pos=None):
        obj_pos = obj_pos or self.position(time)
        subj_pos = subj_pos or subj.position(time)
        # 1 - (1 - v) * (1 - z) = 1 - (1 - z - v + v*z) = 1 - 1 + z + v - v*z = z + v + v*z
        visibility = self.get_visibility(time=time)  # v - видимость
        vigilance = subj.params.get('p_vigilance').value  # z - зоркость
        vis = visibility + vigilance - visibility * vigilance
        res = (subj.get_observing_range(time=time) * vis) >= abs(obj_pos - subj_pos)
        return res and super(Observer, self).can_see_me(subj=subj, time=time, obj_pos=None, subj_pos=None)

    def can_i_see(self, obj, time, obj_pos=None, subj_pos=None):
        return True
