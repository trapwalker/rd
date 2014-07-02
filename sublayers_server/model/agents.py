# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import Object, SubscriberTo__Observer


class Agent(Object, SubscriberTo__Observer):

    def __init__(self, login, connection=None, **kw):
        log.info('!!!!!!!!Agent before init')
        super(Agent, self).__init__(**kw)
        self.login = login
        self._connection = connection
        # todo: normalize and check login
        self.server.agents[login] = self
        self.cars = []  # specific

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
        @param model.messages.Message message: Incoming message
        """
        log.info('%s. %s say: %s', self, emitter, message.serialize())
        if self.connection:
            self.connection.write_message(message.serialize())


class User(Agent):
    # todo: realize
    pass


class AI(Agent):
    # todo: realize in future
    pass
