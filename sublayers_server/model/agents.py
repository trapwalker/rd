# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Object
import messages


from counterset import CounterSet

# todo: make agent offline status possible
class Agent(Object):
    __str_template__ = '<{self.dead_mark}{self.classname} #{self.id} AKA {self.login}>'

    def __init__(self, login, connection=None, party=None, **kw):
        super(Agent, self).__init__(**kw)
        self.observers = CounterSet()
        self.api = None
        # todo: replace Counter to CounterSet
        self.login = login
        self._connection = connection
        # todo: normalize and check login
        self.server.agents[login] = self
        self.cars = []  # specific
        """@type: list[sublayers_server.model.units.Bot]"""
        self.party = None
        if party is not None:
            party.include(self)

        self._auto_fire_enable = None  # нужна, чтобы сохранить состояние авто-стрельбы перед партийными изменениями

    @property
    def is_online(self):
        return self._connection is not None

    def add_observer(self, observer, time=None):
        if not self.is_online:
            return
        # add _self_ into to the all _visible objects_ by _observer_
        self.observers[observer] += 1
        observer.watched_agents[self] += 1
        self.on_see(time=time, subj=observer, obj=observer, is_boundary=False)
        for vo in observer.visible_objects:
            self.on_see(time=time, subj=observer, obj=vo, is_boundary=False)

    def drop_observer(self, observer, time=None):
        if not self.is_online:
            return
        # remove _self_ from all _visible objects_ by _observer_
        for vo in observer.visible_objects:
            self.on_out(time=time, subj=observer, obj=vo, is_boundary=False)
        self.on_out(time=time, subj=observer, obj=observer, is_boundary=False)
        observer.watched_agents[self] -= 1
        self.observers[observer] -= 1

    def on_see(self, time, subj, obj, is_boundary):
        is_first = obj.subscribed_agents.inc(self) == 1
        #log.info('_+_+_+_+_+_+_+_+_+_+_+_ %s see by %s length %s', obj.uid, self.cars[0].uid, obj.subscribed_agents[self])
        if not is_first:
            return
        messages.See(
            agent=self,
            time=time or self.server.get_time(),  # todo: check it
            subj=subj,
            obj=obj,
            is_boundary=is_boundary,
            is_first=is_first,
        ).post()

    def on_out(self, time, subj, obj, is_boundary):
        is_last = obj.subscribed_agents.dec(self) == 0
        #if self.cars:
            #log.info('_+_+_+_+_+_+_+_+_+_+_+_ %s out by %s length %s', obj.uid, self.cars[0].uid, obj.subscribed_agents[self])
        if not is_last:
            return
        messages.Out(
            agent=self,
            time=time or self.server.get_time(),  # todo: check it
            subj=subj,
            obj=obj,
            is_boundary=is_boundary,
            is_last=is_last,
        ).post()

    def as_dict(self, *av, **kw):
        d = super(Agent, self).as_dict(*av, **kw)
        d.update(
            login=self.login,
            party=self.party.as_dict() if self.party else None,
        )
        return d

    @property
    def connection(self):
        return self._connection

    @connection.setter
    def connection(self, new_connection):
        self._connection = new_connection

    def append_car(self, car):  # specific
        if car not in self.cars:
            self.cars.append(car)
            car.agent = self
            self.add_observer(car)
            if self.party:
                # сообщить пати, что этот обсёрвер теперь добавлен на карту
                self.party.add_observer_to_party(car)

    def drop_car(self, car):
        if car in self.cars:
            if self.party:
                # сообщить пати, что этот обсёрвер теперь убран с карты
                self.party.drop_observer_from_party(car)
            self.drop_observer(car)
            car.agent = None
            self.cars.remove(car)

    def on_message(self, connection, message):
        pass

    def on_disconnect(self, connection):
        pass

    def party_before_include(self, party, new_member):
        # party - куда включают, agent - кого включают
        if not self.is_online:
            return
        car = self.cars[0]
        self._auto_fire_enable = car.is_auto_fire_enable()
        car.fire_auto_enable_all(enable=False)

    def party_after_include(self, party, new_member, old_enable=True):
        # party - куда включили, agent - кого включили
        if not self.is_online:
            return
        self.cars[0].fire_auto_enable_all(time=self.server.get_time() + 0.01, enable=self._auto_fire_enable)

    def party_before_exclude(self, party, old_member):
        # party - откуда исключабт, agent - кого исключают
        if not self.is_online:
            return
        car = self.cars[0]
        self._auto_fire_enable = car.is_auto_fire_enable()
        car.fire_auto_enable_all(enable=False)

    def party_after_exclude(self, party, old_member):
        # party - откуда исключили, agent - кого исключили
        if not self.is_online:
            return
        self.cars[0].fire_auto_enable_all(time=self.server.get_time() + 0.01, enable=self._auto_fire_enable)


class User(Agent):
    # todo: realize
    pass


class AI(Agent):
    # todo: realize in future
    pass
