# -*- coding: utf-8 -*-

from utils import get_uid, TimelineQueue
import contacts
import events


class Server(object):

    def __init__(self, uid=None):
        """
        @param uuid.UUID uid: Unique id of server
        """
        self.uid = uid or get_uid()
        # todo: GEO-indexing collections
        self.objects = {}  # Total GEO-objects in game by uid
        self.statics = []  # Stationary objects (stations, heaps, standing robots)  # todo: GEO-index
        self.motions = []  # Active motion tasks  # todo: GEO-index
        self.static_observers = []  # todo: GEO-index
        self.timeline = TimelineQueue()  # todo: make remote timeline for remote servers

    def filter_motions(self, quadrant):
        # todo: typehinting of quadrant
        return self.motions  # todo: filter collection by quadrant

    def filter_statics(self, quadrant):
        return self.statics  # todo: filter collection by quadrant

    def filter_static_observers(self, quadrant):
        return self.static_observers  # todo: filter collection by quadrant


class LocalServer(Server):

    def __init__(self, **kw):
        super(LocalServer, self).__init__(**kw)

    def dispatch_contact(self):
        timeline = self.timeline
        if timeline:
            contact = timeline.head
            assert isinstance(contact, contacts.Contact)
            observer = contact.subj.observer
            if observer:
                observer.emit(events.Contact(e_type=contact.kind, time=contact.time, obj=con))


class RemoteServer(Server):

    def __init__(self, uri, **kw):
        super(RemoteServer, self).__init__(**kw)
        self.uri = uri
