# -*- coding: utf-8 -*-


class Emitter(object):

    def __init__(self):
        self.subscriptions = []
        """@type: list[Subscription]"""

    def subscribe(self, subscriber):
        self.subscriptions.append(subscriber)

    def unsubscribe(self, subscriber):
        self.subscriptions.remove(subscriber)

    def emit(self, event):
        for subscriber in self.subscriptions:
            subscriber.onEvent(event)


class Subscriber(object):

    def onEvent(self, event):
        pass


class Event(object):
    def __init__(self, eType, position=None):
        self.position = position

