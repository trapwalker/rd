# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from sublayers_server.model.server_api import ServerAPI
from sublayers_server.model.utils import get_uid, TimelineQueue, get_time
from sublayers_server.model.effects import get_effects
from sublayers_server.model.stat_log import StatLogger
from sublayers_server.model.visibility_manager import VisibilityManager
from sublayers_server.model import errors

from sublayers_server.model.map_location import RadioPoint, Town, GasStation
from sublayers_server.model.events import LoadWorldEvent
from sublayers_server.model.registry.storage import Registry, Collection
from sublayers_server.model.async_tools import async_deco2
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
        """:type : dict[unicode, sublayers_server.model.event_machine.model.agents.Agent]"""
        # todo: Typehinting
        self.start_time = None
        # todo: blocking of init of servers with same uid

        self.reg = Registry(name='registry', path=os.path.join(options.world_path, 'registry'))
        self.reg_agents = Collection(name='agents', path=os.path.join(options.world_path, 'state'))

        self.effects = dict()
        get_effects(server=self)

        self.zones = []

        self.stat_log = StatLogger()
        self.visibility_mng = VisibilityManager(server=self)

    def __getstate__(self):
        d = self.__dict__.copy()
        del d['reg_agents']
        return d

    @staticmethod
    def get_time():
        return get_time()

    def load_world(self):
        LoadWorldEvent(server=self, time=self.get_time()).post()

    @async_deco2(error_callback=lambda error: log.warning('Read Zone: on_error(%s)', error))
    def init_zones(self, time):
        zones = list(self.reg['/zones'])
        zones.sort(key=lambda a_zone: a_zone.order_key)
        for zone in zones:
            try:
                if not zone.is_active:
                    log.info('Try to activate zone %s', zone)
                    zone.activate(server=self, time=time)
                    # todo: Генерировать исключения при неудачной активации зон
                if zone.is_active:
                    log.info('Zone %s activated successfully', zone)
                else:
                    log.warning('Zone %s is not activated')
            except Exception as e:
                log.error('Loading zone %r error: %s', zone, e)

    def on_load_world(self, event):
        # todo: регистрация эффектов, должно быть обязательно раньше зон

        # создание зон
        self.init_zones(time=event.time)

        # загрузка радиоточек
        towers_root = self.reg['/poi/radio_towers']
        for rt_exm in towers_root:
            RadioPoint(time=event.time, example=rt_exm, server=self)

        # загрузка городов
        towns_root = self.reg['/poi/locations/towns']
        for t_exm in towns_root:
            Town(time=event.time, server=self, example=t_exm)

        # загрузка заправочных станций
        gs_root = self.reg['/poi/locations/gas_stations']
        for gs_exm in gs_root:
            GasStation(time=event.time, server=self, example=gs_exm)

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

    def save(self, time):
        log.debug('=' * 10 + ' Server SAVE start ' + '=' * 10)
        for agent in self.agents.values():
            agent.save(time=time)
        log.debug('=' * 10 + ' Server SAVE end   ' + '=' * 10)


class EServerAlreadyStarted(errors.EIllegal):
    pass


class EServerIsNotStarted(errors.EIllegal):
    pass


class LocalServer(Server):

    def __init__(self, app=None, **kw):
        super(LocalServer, self).__init__(**kw)
        self.api = ServerAPI(self)
        self.thread = None
        self.is_terminated = False
        self.app = app

    def __getstate__(self):
        d = super(LocalServer, self).__getstate__()
        del d['app']
        del d['thread']
        return d

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
        # if self.app:
        #     self.app.stop()  # todo: checkit

    # todo: pause

    @property
    def is_active(self):
        return self.thread is not None and self.thread.is_alive()

    def dump(self):
        import yaml
        with open('srv_dump.yaml', 'w') as f:
            yaml.dump(self, stream=f)

        with open('srv_dump.yaml', 'r') as f:
            srv2 = yaml.load(stream=f)

    def save(self, *av, **kw):
        super(LocalServer, self).save(*av, **kw)

    def dump(self):
        import yaml
        with open('srv_dump.yaml', 'w') as f:
            yaml.dump(self, stream=f)

        with open('srv_dump.yaml', 'r') as f:
            srv2 = yaml.load(stream=f)

    def reset_user(self, user=None):
        if user is None:
            pass


def main():
    pass
    # log.info('==== Start logging ' + '=' * 50)
    #
    # from sublayers_server.model.units import Station, Bot
    # from sublayers_server.model.agents import User
    # from sublayers_server.model.vectors import Point
    #
    # def inspect(event=None):
    #     events.Event(time=srv.get_time() + 1, callback_before=inspect).post()
    #     if event:
    #         log.info('INSPECT[%s] - %s', time_log_format(event.time), bot)
    #
    # srv = LocalServer()
    # inspect()
    # user = User(login='user1', server=srv)
    # station = Station(server=srv, position=Point(0, 0))
    # user.subscribe_to__Observer(station)
    #
    # bot = Bot(server=srv, position=Point(-600, -10))
    # user.subscribe_to__Observer(bot)
    #
    # bot.set_motion(position=Point(800, 10))
    #
    # pp(srv.timeline, width=1)
    #
    # return locals()
