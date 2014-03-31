# -*- coding: utf-8 -*-
from subscription_protocol import Subscriber, Emitter
import messages

import logging


class Observer(Subscriber, Emitter):
    """todo: make docstring"""

    def __init__(self, owner, r=None):
        """
        @param model.units.Unit owner: Observer owner unit
        @param float | None r: Radius of observing
        """
        super(Observer, self).__init__()
        self._r = r or BALANCE.get_ObserverRange(owner)
        self.owner = owner

    def on_event(self, emitter, *av, **kw):
        #logging.debug('{self}: {emitter}  {av}, {kw}'.format(**locals()))
        self.emit(message=messages.See(sender=self.owner, obj=emitter))

    @property
    def r(self):
        return self._r

    def __str__(self):
        return '<Observer: R={:g}; n={}>'.format(self.r, self.subscribers_count)

    id = property(id)


from balance import BALANCE
