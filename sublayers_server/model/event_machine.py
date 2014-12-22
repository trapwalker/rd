# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from server_api import ServerAPI
from utils import get_uid, TimelineQueue, get_time, time_log_format
import events
import errors
from party import PartyDispatcher

from time import sleep
from threading import Thread
from pprint import pprint as pp
from itertools import chain
from collections import deque

MAX_SERVER_SLEEP_TIME = 0.1


class Server(object):

    def __init__(self, uid=None):
        """
        @param uuid.UUID uid: Unique id of server
        """
        self.uid = uid or get_uid()
        # todo: GEO-indexing collections
        self.objects = {}  # Total GEO-objects in game by uid
        self.static_objects = []  # todo: GEO-index
        self.moving_objects = []  # todo: GEO-index
        self.static_observers = []  # todo: GEO-index
        self.timeline = TimelineQueue()  # todo: make remote timeline for remote servers
        self.message_queue = deque()
        self.agents = {}  # Agents dictionary
        # todo: Typehinting
        self.start_time = None
        self.api = ServerAPI(self)
        # todo: blocking of init of servers with same uid
        self.parties = PartyDispatcher()

    def filter_objects(self, quadrant):
        # todo: typehinting of quadrant
        return chain(
            self.filter_static(quadrant),
            self.filter_moving(quadrant),  # todo: optimize
        )

    def filter_moving(self, quadrant):
        # todo: typehinting of quadrant
        return self.moving_objects  # todo: filter collection by quadrant

    def filter_static(self, quadrant):
        # todo: typehinting of quadrant
        return self.static_objects  # todo: filter collection by quadrant

    def filter_static_observers(self, quadrant):
        return self.static_observers  # todo: filter collection by quadrant

    @staticmethod
    def get_time():
        return get_time()

    def post_message(self, message):
        """
        @param sublayers_server.model.messages.Message message: message to sent
        """
        self.message_queue.append(message)

    def post_event(self, event):
        """
        @param sublayers_server.model.events.Event event: New event
        """
        self.timeline.put(event)

    def post_events(self, events_list):
        """
        @param iterable[sublayers_server.model.events.Event] events_list: New events iterator
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
        log.info('---- Event loop start')
        timeout = MAX_SERVER_SLEEP_TIME
        timeline = self.timeline
        message_queue = self.message_queue

        while not self.is_terminated:
            while message_queue:
                message_queue.popleft().send()
                # todo: mass sending optimizations over separated chat server

            if not timeline:
                sleep(timeout)
                continue
            
            if not timeline.head.actual:
                event = timeline.get()
                del event
                continue

            t = self.get_time()
            t1 = timeline.head.time

            if t1 > t:
                sleep(min(t1 - t, timeout))
                continue

            event = timeline.get()
            try:
                event.perform()
            except:
                log.exception('Event performing error %s', event)

        log.info('---- Event loop stop ' + '-' * 50 + '\n')

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

    # todo: pause

    @property
    def is_active(self):
        return self.thread is not None and self.thread.is_alive()


def main():
    log.info('==== Start logging ' + '=' * 50)

    from units import Station, Bot
    from agents import User
    from vectors import Point

    def inspect(event=None):
        events.Callback(time=srv.get_time() + 1, func=inspect).send()
        if event:
            log.info('INSPECT[%s] - %s', time_log_format(event.time), bot)

    srv = LocalServer()
    inspect()
    user = User(login='user1', server=srv)
    station = Station(server=srv, position=Point(0, 0))
    user.subscribe_to__Observer(station)

    bot = Bot(server=srv, position=Point(-600, -10))
    user.subscribe_to__Observer(bot)

    bot.goto(Point(800, 10))

    pp(srv.timeline, width=1)

    return locals()
