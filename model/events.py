# -*- coding: utf-8 -*-


class Emitter(object):
    def __init__(self):
        self.subscriptions = []
        """@type: list[Subscription]"""

    def subscribe(self, subscriber):
        """
        @param Subscriber subscriber: New subsriber
        """
        self.subscriptions.append(subscriber)

    def unsubscribe(self, subscriber):
        """
        @param Subscriber subscriber: Subscriber to remove
        """
        self.subscriptions.remove(subscriber)

    def emit(self, event):
        """
        @param Event event: New emited event
        """
        for subscriber in self.subscriptions:
            subscriber.onEvent(event)


class Subscriber(object):
    def on_event(self, event):
        """
        @param Event event: Incoming event
        """
        pass


class Event(object):
    def __init__(self, e_type, position=None):
        """
        @param int e_type: Event type
        @param model.vectors.Point | None position: Event location
        """
        self.position = position
        self.e_type = e_type

