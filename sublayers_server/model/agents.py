# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import Object, SubscriberTo__Observer
from model.agent_api import make_push_package
from model.utils import serialize


class Agent(Object, SubscriberTo__Observer):
    __str_template__ = '<{self.dead_mark}{self.__class__.__name__} #{self.id} AKA {self.login}>'

    def __init__(self, login, connection=None, **kw):
        log.info('!!!!!!!!Agent before init')
        super(Agent, self).__init__(**kw)
        self.login = login
        self._connection = connection
        # todo: normalize and check login
        self.server.agents[login] = self
        self.cars = []  # specific

    def as_dict(self):
        d = super(Agent, self).as_dict()
        d.update(
            login=self.login,
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

    def on_message(self, connection, messahe):
        pass

    def on_disconnect(self, connection):
        pass

    def on_event_from__Observer(self, emitter, message):
        """
        @param model.units.Observer emitter: Message emitter
        @param model.messages.UnitMessage message: Incoming message
        """
        if self.connection:
            package = make_push_package([message])
            log.debug('Send to agent %s: %r', self, package)
            self.connection.write_message(serialize(package))


class User(Agent):
    # todo: realize
    pass


class AI(Agent):
    # todo: realize in future
    pass
