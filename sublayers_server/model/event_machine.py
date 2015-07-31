# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from sublayers_server.model.server_api import ServerAPI
from sublayers_server.model.utils import get_uid, TimelineQueue, get_time, time_log_format
from sublayers_server.model.zones import init_zones_on_server
from sublayers_server.model.effects import get_effects
from sublayers_server.model.stat_log import StatLogger
from sublayers_server.model.visibility_manager import VisibilityManager
from sublayers_server.model import errors

from sublayers_server.model.vectors import Point
from sublayers_server.model.town import RadioPoint, Town, GasStation
from sublayers_server.model.events import LoadWorldEvent
from sublayers_server.model.units import Mobile
from sublayers_server.model.registry.tree import Registry, Collection, Dispatcher  # todo: rename
import sublayers_server.model.registry.classes  # todo: autoregistry classes

import os
import sys
from time import sleep
from threading import Thread
from pprint import pprint as pp
from collections import deque
from tornado.options import options  # todo: Пробросить опции в сервер при создании оного

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

        self.reg_dispatcher = Dispatcher()
        reg_path = os.path.join(options.world_path, 'registry')
        self.reg = Registry(
            dispatcher=self.reg_dispatcher,
            name='registry',
            path=reg_path,
        )
        self.reg_agents = Collection(dispatcher=self.reg_dispatcher, name='agents', path=None)  # todo: set path

        self.effects = dict()
        get_effects(server=self)

        self.zones = []

        self.stat_log = StatLogger(owner=self)
        self.visibility_mng = VisibilityManager(server=self)

    @staticmethod
    def get_time():
        return get_time()

    def load_world(self):
        LoadWorldEvent(server=self, time=self.get_time()).post()

    def on_load_world(self, event):
        # todo: регистрация эффектов, должно быть обязательно раньше зон

        # создание зон
        init_zones_on_server(server=self, time=event.time)

        # загрузка радиоточек
        towers_root = self.reg['/poi/radio_towers']
        for rt_exm in towers_root:
            RadioPoint(time=event.time,
                       observing_range=rt_exm.range,
                       name=rt_exm.name,
                       server=self,
                       position=rt_exm.position,
            )

        # загрузка городов
        towns_root = self.reg['/poi/locations/towns']
        for t_exm in towns_root:
            Town(time=event.time,
                 server=self,
                 example=t_exm,
                 observing_range=t_exm.enter_range,
                 svg_link=t_exm.svg_link,
                 town_name=t_exm.title,
                 position=t_exm.position,
            )

        # загрузка заправочных станций
        gs_root = self.reg['/poi/locations/gas_stations']
        for gs_exm in gs_root:
            GasStation(time=event.time,
                       server=self,
                       example=gs_exm,
                       observing_range=gs_exm.enter_range,
                       svg_link=gs_exm.svg_link,
                       position=gs_exm.position)





        # Mobile(server=self,
        #        time=event.time,
        #        max_hp=1000,
        #        position=Point(12496376, 27133550),
        #        r_min=10,
        #        ac_max=50,
        #        v_forward=5,
        #        v_backward=-5,
        #        a_forward=5,
        #        a_backward=-5,
        #        a_braking=-5,
        # )
        #
        # Mobile(server=self,
        #        time=event.time,
        #        max_hp=1000,
        #        position=Point(12496356, 27133550),
        #        r_min=10,
        #        ac_max=50,
        #        v_forward=5,
        #        v_backward=-5,
        #        a_forward=5,
        #        a_backward=-5,
        #        a_braking=-5,
        # )
        
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

    def get_server_stat(self):
        st = self.stat_log
        return dict(
            s_agents_all=st.get_metric('s_agents_all'),
            s_agents_on=st.get_metric('s_agents_on'),
            s_units_all=st.get_metric('s_units_all'),
            s_units_on=st.get_metric('s_units_on'),
            s_events_all=st.get_metric('s_events_all'),
            s_events_on=st.get_metric('s_events_on'),
            s_events_lag_max=st.get_metric('s_events_lag_max'),
            s_events_lag_cur=st.get_metric('s_events_lag_cur'),
            s_events_lag_mid=st.get_metric('s_events_lag_mid'),
        )

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
    pass
    '''
    log.info('==== Start logging ' + '=' * 50)

    from sublayers_server.model.units import Station, Bot
    from sublayers_server.model.agents import User
    from sublayers_server.model.vectors import Point

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
    '''
