# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import Object
import messages

from collections import Counter

# todo: make agent offline status possible


class Agent(Object):
    __str_template__ = '<{self.dead_mark}{self.classname} #{self.id} AKA {self.login}>'

    def __init__(self, login, connection=None, party=None, **kw):
        super(Agent, self).__init__(**kw)
        self.observers = Counter()
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

    @property
    def is_online(self):
        return self._connection is not None

    def add_observer(self, observer, time=None):
        # add _self_ into to the all _visible objects_ by _observer_
        self.observers[observer] += 1
        observer.watched_agents[self] += 1
        self.on_see(time=time, subj=observer, obj=observer, is_boundary=False)
        for vo in observer.visible_objects:
            self.on_see(time=time, subj=observer, obj=vo, is_boundary=False)

    def drop_observer(self, observer, time=None):
        # remove _self_ from all _visible objects_ by _observer_
        for vo in observer.visible_objects:
            self.on_out(time=time, subj=observer, obj=vo, is_boundary=False)
        self.on_out(time=time, subj=observer, obj=observer, is_boundary=False)
        observer.watched_agents[self] -= 1
        self.observers[observer] -= 1

    def on_see(self, time, subj, obj, is_boundary):
        is_first = obj.subscribed_agents.inc(self) == 1
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
            party=self.party.as_dict(),
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

    def drop_car(self, car):
        if car in self.cars:
            self.drop_observer(car)
            car.agent = None
            self.cars.remove(car)

    def on_message(self, connection, message):
        pass

    def on_disconnect(self, connection):
        pass


class User(Agent):
    # todo: realize
    pass


class AI(Agent):
    # todo: realize in future
    pass
