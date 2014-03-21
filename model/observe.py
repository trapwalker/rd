# -*- coding: utf-8 -*-
import logging


class Observer(object):
    """todo: make docstring"""

    def __init__(self, owner, r=None):
        """
        @param owner: model.units.Unit
        @param r: float | None
        """
        super(Observer, self).__init__()
        self._r = r or BALANCE.get_ObserverRange(owner)
        self.owner = owner
        self.subscribers = []
        """@type: list[model.agents.Agent]"""

    def emit(self, event):
        """
        @param Event event: New emited event
        """
        for subscriber in self.subscribers:
            subscriber.on_event(event)

    def subscribe(self, agent):
        """
        @type agent: model.agents.Agent
        """
        self.subscribers.append(agent)
        logging.debug('Subscribe %s to observe %s', agent, self.owner)

    def unsubscribe(self, agent):
        """
        @type agent: model.agents.Agent
        """
        self.subscribers.remove(agent)
        logging.debug('Unsubscribe %s from observing %s', agent, self.owner)

    @property
    def r(self):
        return self._r

    def __str__(self):
        return '<Observer: R={:g}; n=%d>'.format(self.r, len(self.subscribers))


from balance import BALANCE
