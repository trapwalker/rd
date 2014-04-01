# -*- coding: utf-8 -*-

from base import Object
from subscription_protocol import Subscriber


import logging


class Agent(Object, Subscriber):

    def __init__(self, **kw):
        super(Agent, self).__init__(**kw)

    def on_event(self, emitter, message):
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
