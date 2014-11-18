# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import Object, SubscriberTo__Observer
from agent_api import make_push_package
from utils import serialize


class Agent(Object, SubscriberTo__Observer):
    __str_template__ = '<{self.dead_mark}{self.__class__.__name__} #{self.id} AKA {self.login}>'

    def __init__(self, login, connection=None, party=None, **kw):
        log.info('!!!!!!!!Agent before init')
        super(Agent, self).__init__(**kw)
        self.observers = []
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
        observer.agents[self] += 1
        for vo in observer.iter_by__VisibleObject():
            vo.agents[self] += 1


    def on_after_unsubscribe_from__Observer(self, observer):
        # remove _self_ from all _visible objects_ by _observer_
        for vo in observer.iter_by__VisibleObject():
            vo.agents[self] -= 1

        observer.agents[self] -= 1
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
        self.subscribe_to__Observer(car)

    def drop_car(self, car):
        if car not in self.cars:
            return
        self.cars.remove(car)
        self.unsubscribe_from__Observer(car)

    def on_message(self, connection, messahe):
        pass

    def on_disconnect(self, connection):
        pass

    def on_event_from__Observer(self, emitter, message):
        """
        @param sublayers_server.model.units.Observer emitter: Message emitter
        @param sublayers_server.model.messages.UnitMessage message: Incoming message
        """
        self.send_message_to_client(message)

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
