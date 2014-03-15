# -*- coding: utf-8 -*-

from balance import BALANCE


class Observer(object):
    """todo: make docstring"""

    def __init__(self, owner, r=None):
        """
        @param owner: model.units.Unit
        @param r: float | None
        """
        super(Observer, self).__init__()
        self._r = r or BALANCE.get_ObserverRange(owner)
        self.subscribers = set()

    def subscribe(self, s):
        if isinstance(s, (list, tuple)):
            s = set(s)
        elif not isinstance(s, set):
            s = {s}
        self.subscribers += s

    def unsubscribe(self, s):
        if isinstance(s, (list, tuple)):
            s = set(s)
        elif not isinstance(s, set):
            s = {s}
        self.subscribers -= s

    @property
    def r(self):
        return self._r
