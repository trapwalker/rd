# -*- coding: utf-8 -*-
# todo: thread safe operations


class MetaSubscriberTo(type):
    def __new__(cls, *args, **kwargs):
        pass



class Subscriber(object):
    
    def __init__(self):
        super(Subscriber, self).__init__()
        self._emitters = []

    @property
    def emitters_count(self):
        return len(self._emitters)

    def subscribe(self, emitter):
        self._emitters.append(emitter)
        emitter._subscribers.append(self)

    def unsubscribe(self, emitter):        
        emitter._subscribers.remove(self)
        self._emitters.remove(emitter)

    def unsubscribe_all(self):
        unsubscribe = self.unsubscribe
        for emitter in self._emitters[:]:
            unsubscribe(emitter)

    def on_event(self, emitter, *av, **kw):
        print self, emitter, av, kw
        pass
        

class Emitter(object):
    
    def __init__(self):
        super(Emitter, self).__init__()
        self._subscribers = []

    @property
    def subscribers_count(self):
        return len(self._subscribers)

    def emit(self, *av, **kw):
        for subscriber in self._subscribers:
            subscriber.on_event(self, *av, **kw)

    def reject_subscribers(self):
        for subscriber in self._subscribers[:]:
            subscriber.unsubscribe(self)
