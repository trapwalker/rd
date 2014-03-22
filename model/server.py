# -*- coding: utf-8 -*-

from utils import get_uid, TimelineQueue, get_time
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

    def get_time(self):
        return get_time()


class LocalServer(Server):

    def __init__(self, **kw):
        super(LocalServer, self).__init__(**kw)

    def event_loop(self):
        logging.debug('Event loop start')
        dispatch = self.dispatch_event
        MAX_SERVER_SLEEP_TIME = 0.1

        while True:
            dispatch(MAX_SERVER_SLEEP_TIME)

    def dispatch_event(self, timeout):
        timeline = self.timeline
        if timeline:
            if timeline.head.time <= self.get_time():
                event = timeline.get()
                if isinstance(event, Contact):
                    event.subj.observer.emit(event)
                else:
                    logging.info('! Unknown event: %s', event)

                return event


class RemoteServer(Server):

    def __init__(self, uri, **kw):
        super(RemoteServer, self).__init__(**kw)
        self.uri = uri


def main(*args):
    pass
    

if __name__ == '__main__':
    import sys
    logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
    #main(*sys.argv)

    from units import Station, Bot
    from agents import User
    from vectors import Point
    
    srv = LocalServer()
    user = User(server=srv)
    station = Station(server=srv, position=Point(0, 0))
    station.observer.subscribe(user)

    bot = Bot(server=srv, position=Point(-600, -10))
    bot.observer.subscribe(user)

    bot.goto(Point(800, 10))

    t = srv.get_time()
    while srv.timeline:        
        if srv.dispatch_event(0.5) or (srv.get_time() - t) > 1:
            print bot
            t = srv.get_time()
    
    #srv.event_loop()

