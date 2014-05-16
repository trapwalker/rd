# -*- coding: utf-8 -*-

from utils import get_uid, TimelineQueue, get_time, time_log_format
import events
import errors
from agents import User

from time import sleep
from threading import Thread
import logging
from pprint import pprint as pp


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
        self.agents = {}  # Agents dictionary
        # todo: Typehinting
        self.start_time = None
        # todo: blocking of init of servers with same uid

    def get_agent(self, agent_id, make=False):
        agent = self.agents.get(agent_id, None)
        if not agent and make:
            agent = User(login=agent_id)
        return agent

    def filter_motions(self, quadrant):
        # todo: typehinting of quadrant
        return self.motions  # todo: filter collection by quadrant

    def filter_statics(self, quadrant):
        return self.statics  # todo: filter collection by quadrant

    def filter_static_observers(self, quadrant):
        return self.static_observers  # todo: filter collection by quadrant

    def get_time(self):
        return get_time()

    def post_event(self, event):
        """
        @param model.events.Event event: New event
        """
        self.timeline.put(event)

    def post_events(self, events_list):
        """
        @param iterable[model.events.Event] events_list: New events iterator
        """
        for event in events_list:
            self.post_event(event)


class EServerAlreadyStarted(errors.EIllegal):
    pass


class EServerIsNotStarted(errors.EIllegal):
    pass


class LocalServer(Server):

    def __init__(self, app=None, **kw):
        super(LocalServer, self).__init__(**kw)
        self.thread = None
        self.is_terminated = False
        self.app = app

    def event_loop(self):
        logging.info('\n---- Event loop start ' + '-' * 50)
        timeout = MAX_SERVER_SLEEP_TIME
        timeline = self.timeline

        while not self.is_terminated:
            if not timeline:
                sleep(timeout)
                continue
            
            if not timeline.head.actual:
                event = timeline.get()
                logging.debug('SKIP unactual %s', event)
                del event
                continue

            t = self.get_time()
            t1 = timeline.head.time

            if t1 > t:
                sleep(min(t1 - t, timeout))
                continue

            timeline.get().perform()

        logging.info('---- Event loop stop ' + '-' * 50 + '\n')        

    def start(self):
        if self.thread:
            raise EServerAlreadyStarted()
        self.start_time = self.get_time()
        self.thread = Thread(target=self.event_loop)
        self.thread.start()

    def stop(self, timeout=None):
        if not self.is_active:
            raise EServerIsNotStarted()
        self.is_terminated = True
        self.thread.join(timeout)
        self.thread = None
        self.is_terminated = False
        if self.app:
            self.app.stop()

    @property
    def is_active(self):
        return self.thread is not None and self.thread.is_alive()


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
        srv.post_event(events.Callback(time=srv.get_time() + 1, func=inspect))
        logging.info('INSPECT[%s] - %s', time_log_format(event.time), bot)

    srv = LocalServer()
    srv.post_event(events.Callback(time=srv.get_time() + 1, func=inspect))
    user = User(login='user1', server=srv)
    station = Station(server=srv, position=Point(0, 0))
    user.subscribe_to__Observer(station)

    bot = Bot(server=srv, position=Point(-600, -10))
    user.subscribe_to__Observer(bot)

    bot.goto(Point(800, 10))

    pp(srv.timeline, width=1)

    srv.start()
