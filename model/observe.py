# -*- coding: utf-8 -*-
import logging


class Observer(object):
    """todo: make docstring"""

    def __init__(self, owner, r=None):
        """
        @param model.units.Unit owner: Observer owner unit
        @param float | None r: Radius of observing
        """
        super(Observer, self).__init__()
        self._r = r or BALANCE.get_ObserverRange(owner)
        self.owner = owner
        self.subscribers = []
        """@type: list[model.agents.Agent]"""
        self.seeable = []
        """@type: list[model.base.VisibleObject]"""

    def see(self, obj):
        """
        @param model.base.VisibleObject obj: New seeable object for registration
        """
        self.seeable.append(obj)
        obj.watchers.append(self)

    def out(self, obj):
        """
        @param model.base.VisibleObject obj: Lost sight of the object
        """
        obj.watchers.remove(self)
        self.seeable.remove(obj)

    def emit(self, event):
        """
        @param model.events.Event event: New emited event
        """
        for subscriber in self.subscribers:
            subscriber.on_event(event)

    def subscribe(self, agent):
        """
        @type model.agents.Agent agent: New agent for subscribe
        """
        self.subscribers.append(agent)
        logging.debug('Subscribe %s to observe %s', agent, self.owner)

    def unsubscribe(self, agent):
        """
        @type model.agents.Agent agent: Unsubscribed agent
        """
        self.subscribers.remove(agent)
        logging.debug('Unsubscribe %s from observing %s', agent, self.owner)

    @property
    def r(self):
        return self._r

    def __str__(self):
        return '<Observer: R={:g}; n={}>'.format(self.r, len(self.subscribers))

    id = property(id)


from balance import BALANCE
