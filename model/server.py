# -*- coding: utf-8 -*-

from utils import get_uid, TimelineQueue, get_time
import events
from time import sleep
import logging

MAX_SERVER_SLEEP_TIME = 0.1


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
        logging.info('Event loop start')
        timeout = MAX_SERVER_SLEEP_TIME
        dispatch = self.dispatch_event
        timeline = self.timeline

        while True:
            if not timeline:
                sleep(timeout)
                continue
            
            if not timeline.head.actual:
                timeline.get()
                continue

            t = self.get_time()
            t1 = timeline.head.time

            if t1 > t:
                sleep(min(t1 - t, timeout))
                continue

            dispatch(timeline.get())

    run = event_loop

    def dispatch_event(self, event):
        assert event.actual
        if isinstance(event, events.Contact):
            event.subj.observer.emit(event)
        elif isinstance(event, events.Callback):
            event.run()
        else:
            logging.info('! Unknown event: %s', event)


def main(*args):
    pass


if __name__ == '__main__':
    import sys
    logging.basicConfig(level=logging.DEBUG, filename='server.log')
    logging.info('\n==== Start logging ' + '=' * 50)
    #main(*sys.argv)

    from units import Station, Bot
    from agents import User
    from vectors import Point

    def inspect(event):
        srv.timeline.put(events.Callback(time=event.time + 1, func=inspect))
        logging.info('INSPECT - %s', bot)

    srv = LocalServer()
    srv.timeline.put(events.Callback(time=srv.get_time() + 1, func=inspect))
    user = User(server=srv)
    station = Station(server=srv, position=Point(0, 0))
    station.observer.subscribe(user)

    bot = Bot(server=srv, position=Point(-600, -10))
    bot.observer.subscribe(user)

    bot.goto(Point(800, 10))

    srv.run()


