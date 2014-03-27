# -*- coding: utf-8 -*-

from base import Object
import logging


class Agent(Object):

    def __init__(self, **kw):
        super(Agent, self).__init__(**kw)

    def on_event(self, event):
        """
        @param Event event: Incoming event
        """
        logging.info('%s say: %s', self, event)


class User(Agent):
    # todo: realize
    pass


class AI(Agent):
    # todo: realize in future
    pass
