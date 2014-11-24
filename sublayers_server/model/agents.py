# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import Object
from utils import serialize
from collections import Counter

# todo: make agent offline status possible

class Agent(Object):
    __str_template__ = '<{self.dead_mark}{self.__class__.__name__} #{self.id} AKA {self.login}>'

    def __init__(self, login, connection=None, party=None, **kw):
        log.info('!!!!!!!!Agent before init')
        super(Agent, self).__init__(**kw)
        self.observers = Counter()
        self.login = login
        self._connection = connection
        # todo: normalize and check login
        self.server.agents[login] = self
        self.cars = []  # specific
        """@type: list[sublayers_server.model.units.Bot]"""
        self.party = None
        if party is not None:
            party.include(self)
        log.debug('=========%s', self.party)

    def add_observer(self, observer):
        # add _self_ into to the all _visible objects_ by _observer_
        # todo: send contact (with observer) message to agent
        # todo: send contacts (with observed VO) messages to agent
        self.observers[observer] += 1
        observer.watched_agents[self] += 1
        observer.subscribed_agents[self] += 1
        for vo in observer.visible_objects:
            vo.subscribed_agents[self] += 1

    def drop_observer(self, observer):
        # remove _self_ from all _visible objects_ by _observer_
        for vo in observer.visible_objects:
            vo.subscribed_agents[self] -= 1
        observer.subscribed_agents[self] -= 1
        observer.watched_agents[self] -= 1
        self.observers[observer] -= 1
        # todo: send contacts-off (with observed VO) messages to agent
        # todo: send contact-off (with observer) message to agent

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

    def send_update(self, message):
        """
        @param sublayers_server.model.messages.UnitMessage message: Incoming message
        """
        self.send_message_to_client(message)
        # todo: optimize

    # todo: delete
    def send_contact(self, message):
        self.send_message_to_client(message)
        # todo: optimize

    # todo: delete
    def send_message_to_client(self, message):
        """
        @param sublayers_server.model.messages.UnitMessage message: Incoming message
        """
        if self.connection:
            package = make_push_package([message])
            self.connection.write_message(serialize(package))


class User(Agent):
    # todo: realize
    pass


class AI(Agent):
    # todo: realize in future
    pass
