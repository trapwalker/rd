# -*- coding: utf-8 -*-

from utils import get_uid, TimelineQueue
from events import Contact
from time import sleep
import logging


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

    def event_loop(self):
        logging.debug('Event loop start')
        max_sleep_time = 0.1
        dispatch = self.dispatch_event
        while True:
            if not dispatch():
                sleep(max_sleep_time)

    def dispatch_event(self):
        timeline = self.timeline
        if timeline:
            event = timeline.head
            logging.debug('Event dispatching')
            if isinstance(event, Contact):
                observer = event.subj.observer
                if observer:
                    observer.emit(event)

            return True


class RemoteServer(Server):

    def __init__(self, uri, **kw):
        super(RemoteServer, self).__init__(**kw)
        self.uri = uri


def main(*args):
    pass
    

if __name__ == '__main__':
    import sys
    logging.basicConfig(level=logging.DEBUG)
    #main(*sys.argv)

    from units import Station, Bot
    from agents import User
    from vectors import Point
    
    srv = LocalServer()
    user = User(server=srv)
    station = Station(server=srv, position=Point(0, 0))
    station.observer.subscribe(user)

    bot = Bot(server=srv, position=Point(-700, -700))
    bot.observer.subscribe(user)

    bot.goto(Point(800, 800))
    
    srv.event_loop()

