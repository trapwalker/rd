# -*- coding: utf-8 -*-

from base import Object, SubscriberTo__Observer


import logging


class Agent(Object, SubscriberTo__Observer):

    def __init__(self, connection=None, **kw):
        super(Agent, self).__init__(**kw)
        self.connection = connection

    def on_message(self, connection, messahe):
        pass

    def on_disconnect(self, connection):
        pass

    def on_event_from__Observer(self, emitter, message):
        """
        @param model.units.Observer emitter: Message emitter
        @param model.messages.Message message: Incoming message
        """
        logging.info('%s. %s say: %s', self, emitter, message.serialize())


class User(Agent):
    # todo: realize
    pass


class AI(Agent):
    # todo: realize in future
    pass
