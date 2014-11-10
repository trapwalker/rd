# -*- coding: utf-8 -*-
from operator import attrgetter

# todo: thread safe operations


class EventHandlerIsNotImplemented(Exception):
    pass


class Subscriber(type):

    def __new__(mcls, emitter_class):
        emitter_name = emitter_class.__name__ if isinstance(emitter_class, type) else dest_class

        attr_name__count_of = 'count_of__{}'.format(emitter_name)
        attr_name__subscribe_to = 'subscribe_to__{}'.format(emitter_name)
        attr_name__unsubscribe_from_all = 'unsubscribe_from_all__{}'.format(emitter_name)
        attr_name__unsubscribe_from = 'unsubscribe_from__{}'.format(emitter_name)
        attr_name__on_event = 'on_event_from__{}'.format(emitter_name)
        attr_name__emitters_list = '_{}__list'.format(emitter_name)

        attr_getter__unsubscribe_from = attrgetter(attr_name__unsubscribe_from)
        attr_getter__on_event = attrgetter(attr_name__on_event)
        attr_getter__emitters_list = attrgetter(attr_name__emitters_list)

        cls = super(M, mcls).__new__(
            mcls,
            'Subscriber_to__{}'.format(emitter_name),
            (object,),
            dict(
                '__init__': subscriber__init__,
                attr_name__count_of:
                attr_name__subscribe_to:
                attr_name__unsubscribe_from_all:
                attr_name__unsubscribe_from:
                attr_name__on_event:
                attr_name__emitters_list:
                
            )
        )
        return cls


    @staticmethod
    def __init__(self):
        super(emitter_class, self).__init__()
        setattr(self, attr_name__emitters_list, [])
                            
                                     


def make_subscriber_emitter_classes(subscriber_name, emitter_name):
    subscriber_classname = 'SubscriberTo__{}'.format(emitter_name)
    emitter_classname = 'EmitterFor__{}'.format(subscriber_name)

    attr_name__emitters_list = '_{}__list'.format(emitter_name)
    attr_getter__emitters_list = attrgetter(attr_name__emitters_list)

    attr_name__unsubscribe_from = 'unsubscribe_from__{}'.format(emitter_name)
    attr_getter__unsubscribe_from = attrgetter(attr_name__unsubscribe_from)

    attr_name__on_event = 'on_event_from__{}'.format(emitter_name)
    attr_getter__on_event = attrgetter(attr_name__on_event)

    attr_name__subscribers_list = '_{}__list'.format(subscriber_name)
    attr_getter__subscribers_list = attrgetter(attr_name__subscribers_list)

    def subscriber__init__(self):
        super(subscriber_class, self).__init__()
        setattr(self, attr_name__emitters_list, [])

    def emitter__init__(self):
        super(emitter_class, self).__init__()
        setattr(self, attr_name__subscribers_list, [])

    def get_emitters_count(self):
        return len(attr_getter__emitters_list(self))

    def get_subscribers_count(self):
        return len(attr_getter__subscribers_list(self))

    def subscribe_to(self, emitter):
        attr_getter__emitters_list(self).append(emitter)
        attr_getter__subscribers_list(emitter).append(self)

    def unsubscribe_from(self, emitter):
        attr_getter__subscribers_list(emitter).remove(self)
        attr_getter__emitters_list(self).remove(emitter)

    def unsubscribe_all(self):
        unsubscribe = attr_getter__unsubscribe_from(self)
        for emitter in attr_getter__emitters_list(self)[:]:
            unsubscribe(emitter)

    def event_handler_dummy(self, emitter, *av, **kw):
        raise EventHandlerIsNotImplemented('Method `{}` is not implemented in class `{}` for object {!r}.'.format(
            attr_name__on_event, subscriber_classname, self))

    subscriber_dict = {
        '__init__': subscriber__init__,
        'count_of__{}'.format(emitter_name): property(get_emitters_count),
        'subscribe_to__{}'.format(emitter_name): subscribe_to,
        attr_name__unsubscribe_from: unsubscribe_from,
        'unsubscribe_from_all__{}'.format(emitter_name): unsubscribe_all,
        attr_name__on_event: event_handler_dummy,
    }

    def emit(self, *av, **kw):
        for subscriber in attr_getter__subscribers_list(self):
            attr_getter__on_event(subscriber)(self, *av, **kw)

    def reject_subscribers(self):
        for subscriber in attr_getter__subscribers_list(self)[:]:
            attr_getter__unsubscribe_from(subscriber)(self)

    emitter_dict = {
        '__init__': emitter__init__,
        'count_of__{}'.format(subscriber_name): property(get_subscribers_count),
        'emit_for__{}'.format(subscriber_name): emit,
        'reject_subscribes_from_all__{}'.format(subscriber_name): reject_subscribers,
    }

    subscriber_class = type(subscriber_classname, (object,), subscriber_dict)
    emitter_class = type(emitter_classname, (object,), emitter_dict)
    return subscriber_class, emitter_class
