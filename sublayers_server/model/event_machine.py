# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from server_api import ServerAPI
from utils import get_uid, TimelineQueue, get_time, time_log_format
import events
import errors
from party import PartyDispatcher

import sys
from time import sleep
from threading import Thread
from pprint import pprint as pp
from collections import deque
from zones import init_zones_on_server
from first_mission_parties import RandomCarList

MAX_SERVER_SLEEP_TIME = 0.1

class Server(object):

    def __init__(self, uid=None):
        """
        @param uuid.UUID uid: Unique id of server
        """
        self.uid = uid or get_uid()
        # todo: GEO-indexing collections
        self.objects = {}  # Total GEO-objects in game by uid
        self.geo_objects = []  # todo: GEO-index
        self.timeline = TimelineQueue()  # todo: make remote timeline for remote servers
        self.message_queue = deque()
        self.agents = {}  # Agents dictionary
        # todo: Typehinting
        self.start_time = None
        self.api = ServerAPI(self)
        # todo: blocking of init of servers with same uid

        self.randomCarList = RandomCarList()
        self.parties = PartyDispatcher()
        self.zones = []
        init_zones_on_server(server=self)

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

    memsize = sys.getsizeof


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

    def debug_console_start(self):
        log.info('Try to start IPython shell kernel')
        try:
            from IPython.kernel.zmq.kernelapp import IPKernelApp
            from IPython import embed_kernel
            app = IPKernelApp.instance()
        except:
            log.exception('Ipython kernel import error')
        else:
            def ipython_start():
                try:
                    app.init_signal = lambda *args, **kw: None
                    app.initialize()
                    app.start()

                    embed_kernel(local_ns=dict(
                        srv=self,
                        # todo: embeded shell tools (agents, cars, etc...)
                    ))
                except:
                    log.exception('Ipython kernel start error')

            Thread(target=ipython_start).start()

    def start(self):
        if self.thread:
            raise EServerAlreadyStarted()
        #self.debug_console_start()
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
        #if self.app:
        #    self.app.stop()  # todo: checkit

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
        events.Event(time=srv.get_time() + 1, callback_before=inspect).post()
        if event:
            log.info('INSPECT[%s] - %s', time_log_format(event.time), bot)

    srv = LocalServer()
    inspect()
    user = User(login='user1', server=srv)
    station = Station(server=srv, position=Point(0, 0))
    user.subscribe_to__Observer(station)

    bot = Bot(server=srv, position=Point(-600, -10))
    user.subscribe_to__Observer(bot)

    bot.set_motion(position=Point(800, 10))

    pp(srv.timeline, width=1)

    return locals()
