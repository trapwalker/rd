# -*- coding: utf-8 -*-
from operator import attrgetter

# todo: thread safe operations


class EventHandlerIsNotImplemented(Exception):
    pass


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

    attr_name__on_before_subscribe_to = 'on_before_subscribe_to__{}'.format(emitter_name)
    attr_name__on_after_subscribe_to = 'on_after_subscribe_to__{}'.format(emitter_name)

    attr_name__on_before_unsubscribe_from = 'on_before_unsubscribe_from__{}'.format(emitter_name)
    attr_name__on_after_unsubscribe_from = 'on_after_unsubscribe_from__{}'.format(emitter_name)

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
        getattr(self, attr_name__on_before_subscribe_to)(emitter)
        attr_getter__emitters_list(self).append(emitter)
        attr_getter__subscribers_list(emitter).append(self)
        getattr(self, attr_name__on_after_subscribe_to)(emitter)

    def unsubscribe_from(self, emitter):
        getattr(self, attr_name__on_before_unsubscribe_from)(emitter)
        attr_getter__subscribers_list(emitter).remove(self)
        attr_getter__emitters_list(self).remove(emitter)
        getattr(self, attr_name__on_after_unsubscribe_from)(emitter)

    def unsubscribe_all(self):
        unsubscribe = attr_getter__unsubscribe_from(self)
        for emitter in attr_getter__emitters_list(self)[:]:
            unsubscribe(emitter)

    def event_handler_dummy(self, emitter, *av, **kw):
        raise EventHandlerIsNotImplemented('Method `{}` is not implemented in class `{}` for object {!r}.'.format(
            attr_name__on_event, subscriber_classname, self))

    def on_subscribe_dummy_handler(self, emitter):
        #print 'on_subscribe_dummy_handler({}, {})'.format(self, emitter)
        pass

    def iter_by_subscribers(self):
        return iter(attr_getter__subscribers_list(self))

    def iter_by_emitters(self):
        return iter(attr_getter__emitters_list(self))

    subscriber_dict = {
        '__init__': subscriber__init__,
        'count_of__{}'.format(emitter_name): property(get_emitters_count),
        'subscribe_to__{}'.format(emitter_name): subscribe_to,
        attr_name__unsubscribe_from: unsubscribe_from,
        'unsubscribe_from_all__{}'.format(emitter_name): unsubscribe_all,
        attr_name__on_event: event_handler_dummy,
        'iter_by__{}'.format(emitter_name): iter_by_emitters,

        attr_name__on_before_subscribe_to: on_subscribe_dummy_handler,
        attr_name__on_after_subscribe_to: on_subscribe_dummy_handler,
        attr_name__on_before_unsubscribe_from: on_subscribe_dummy_handler,
        attr_name__on_after_unsubscribe_from: on_subscribe_dummy_handler,
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
        'iter_by__{}'.format(subscriber_name): iter_by_subscribers,
    }

    subscriber_class = type(subscriber_classname, (object,), subscriber_dict)
    emitter_class = type(emitter_classname, (object,), emitter_dict)
    return subscriber_class, emitter_class


if __name__ == '__main__':
    print 'Test'
    SU, EM = make_subscriber_emitter_classes('Su', 'Em')

    class Base(object):
        def __init__(self):
            print 'Base.__init__({})'.format(self)
            super(Base, self).__init__()

        #def on_before_subscribe_to__Em(self, emitter):
        #    super(Base, self).on_before_subscribe_to__Em(emitter)
        #    print 'Base.on_before_subscribe_to__Em({}, {})'.format(self, emitter)
    
    class Em(Base, EM):
        def __init__(self):
            print 'Em.__init__({})'.format(self)
            super(Em, self).__init__()

    class Su(Em, SU):
        def __init__(self):
            print 'Su.__init__({})'.format(self)
            super(Su, self).__init__()

        def on_before_subscribe_to__Em(self, emitter):
            super(Su, self).on_before_subscribe_to__Em(emitter)
            print 'Su.on_before_subscribe_to__Em({}, {})'.format(self, emitter)

        def on_after_subscribe_to__Em(self, emitter):
            print 'Su.on_after_subscribe_to__Em({}, {})'.format(self, emitter)
            super(Su, self).on_after_subscribe_to__Em(emitter)

        def on_before_unsubscribe_from__Em(self, emitter):
            print 'Su.on_before_unsubscribe_from__Em({}, {})'.format(self, emitter)

        def on_after_unsubscribe_from__Em(self, emitter):
            print 'Su.on_after_unsubscribe_from__Em({}, {})'.format(self, emitter)


    print '\nMake Em instances:'
    print 1; em1 = Em()
    print 2; em2 = Em()

    print '\nMake Su instances:'
    print 1; su1 = Su()
    print 2; su2 = Su()
    print 3; su3 = Su()

    print '\nSubscribe:'
    print 1, 1; su1.subscribe_to__Em(em1)
    print 2, 2; su2.subscribe_to__Em(em2)
    print 3, 1; su3.subscribe_to__Em(em1)
    print 3, 2; su3.subscribe_to__Em(em2)
    
    print '\nIter by em2 subscribers:'
    print list(em2.iter_by__Su())

    print '\nIter by su3 emitters:'
    print list(su3.iter_by__Em())

    print '\nFull reject:'
    em2.reject_subscribes_from_all__Su()
