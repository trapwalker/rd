# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from sublayers_server.model.server_api import ServerAPI
from sublayers_server.model.utils import get_uid, TimelineQueue, get_time
from sublayers_server.model.stat_log import StatLogger
from sublayers_server.model.visibility_manager import VisibilityManager
from sublayers_server.model import errors

from sublayers_server.model.map_location import RadioPoint, Town, GasStation
from sublayers_server.model.events import LoadWorldEvent
from sublayers_server.model.async_tools import async_deco2
import sublayers_server.model.registry.classes  # todo: autoregistry classes
from sublayers_server.model.vectors import Point

from sublayers_server.model.registry.storage import Collection
from sublayers_server.model.registry.tree import Root

import os
import sys
import tornado.ioloop
from time import sleep
from threading import Thread
from collections import deque
from tornado.options import options  # todo: Пробросить опции в сервер при создании оного


MAX_SERVER_SLEEP_TIME = 0.1


class Server(object):

    def __init__(self, uid=None):
        """
        @param uuid.UUID uid: Unique id of server
        """
        self.ioloop = tornado.ioloop.IOLoop.instance()
        self.uid = uid or get_uid()
        # todo: GEO-indexing collections
        self.objects = {}  # Total GEO-objects in game by uid
        self.geo_objects = []  # todo: GEO-index
        self.timeline = TimelineQueue()  # todo: make remote timeline for remote servers
        self.message_queue = deque()
        self.agents = {}  # Agents dictionary
        self.agents_by_name = {}  # Agents index by name
        """:type : dict[unicode, sublayers_server.model.event_machine.model.agents.Agent]"""
        # todo: Typehinting
        self.start_time = None
        # todo: blocking of init of servers with same uid

        self.reg = None  # Registry(name='registry')
        self.ioloop.add_callback(callback=self.on_load_registry)
        # self.reg.load(path=os.path.join(options.world_path, u'registry')) # todo: (!!) async call

        self.zones = []

        self.stat_log = StatLogger()
        self.visibility_mng = VisibilityManager(server=self)

        # todo: QuickGame settings fix it
        self.quick_game_cars_examples = []
        self.quick_game_cars_proto = []
        self.quick_game_start_pos = Point(12517168, 27028861)

    def on_load_registry(self):
        def load_registry_done_callback(all_registry_items):
            self.reg = Root.objects.get_cached('reg:///registry')
            log.debug('Registry loaded successfully: %s nodes', len(all_registry_items))

        #Root.load(path=os.path.join(options.world_path), load_registry_done_callback)
        Root.objects.find_all(callback=load_registry_done_callback)

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
        for zone in sorted(list(self.reg['zones']) or [], key=lambda a_zone: a_zone.order_key):
            try:
                if not zone.is_active:
                    log.debug('Zone %s activation start', zone)
                    zone.activate(server=self, time=time)
                    # todo: Генерировать исключения при неудачной активации зон
                    # todo: Измерять время активации зон
                    # todo: Фрагментарная параллельная загрузка зон
                if zone.is_active:
                    log.info('Zone %s activated successfully', zone)
                else:
                    log.warning('Zone %s is not activated')
            except Exception as e:
                log.exception('Loading zone %s error: %s', zone, e)

    def on_load_world(self, event):
        # todo: регистрация эффектов, должно быть обязательно раньше зон

        # создание зон
        self.init_zones(time=event.time)

        # загрузка радиоточек
        towers_root = self.reg['poi/radio_towers']
        for rt_exm in towers_root:
            RadioPoint(time=event.time, example=rt_exm, server=self)

        # загрузка городов
        towns_root = self.reg['poi/locations/towns']
        for t_exm in towns_root:
            Town(time=event.time, server=self, example=t_exm)

        # загрузка заправочных станций
        gs_root = self.reg['poi/locations/gas_stations']
        for gs_exm in gs_root:
            GasStation(time=event.time, server=self, example=gs_exm)

        # Создание экземпляров машинок для быстрой игры
        self.quick_game_cars_proto = []
        self.quick_game_cars_proto.append(self.reg['mobiles/cars/middle/sports/delorean_dmc12'])
        self.quick_game_cars_proto.append(self.reg['mobiles/cars/heavy/btrs/m113a1'])
        for car_proto in self.quick_game_cars_proto:
            # todo: Здесь не должны инстанцироваться машинки
            car_example = car_proto.instantiate()
            # car_example.position = None
            # car_example.last_location = None
            self.quick_game_cars_examples.append(car_example)


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
        self.reg_agents = Collection(name='agents', db=app.db)
        self.periodic = None

    def __getstate__(self):
        d = super(LocalServer, self).__getstate__()
        del d['app']
        del d['thread']
        return d

    def event_loop(self):
        timeout = MAX_SERVER_SLEEP_TIME
        timeline = self.timeline
        message_queue = self.message_queue
        # Выйти, если завершён поток
        if self.is_terminated:
            return

        while message_queue:
            message_queue.popleft().send()  # todo: async sending by ioloop
            # todo: mass sending optimizations over separated chat server

        while timeline and not timeline.head.actual:
            timeline.get()

        if not timeline:
            # Добавление коллбека с максимальной задержкой
            self.ioloop.call_later(delay=MAX_SERVER_SLEEP_TIME, callback=self.event_loop)
            return

        # Если мы здесь, значит все сообщения разосланы, очередь событий не пуста и ближайшее актуально
        t = self.get_time()
        t1 = timeline.head.time

        if t1 > t:
            self.ioloop.call_later(delay=min(t1 - t, timeout), callback=self.event_loop)
            return

        event = timeline.get()
        t = self.get_time()
        try:
            event.perform()
        except:
            log.exception('Event performing error %s', event)
        finally:
            t = self.get_time() - t
            


        self.ioloop.add_callback(callback=self.event_loop)

    def start(self):
        # self.periodic = tornado.ioloop.PeriodicCallback(callback=self.event_loop, callback_time=10)
        # self.periodic.start()
        self.ioloop.add_callback(callback=self.event_loop)
        self.is_terminated = False
        log.info('---- Game server Started ' + '-' * 50 + '\n')

    def stop(self, timeout=None):
        # self.periodic.stop()
        log.info('---- Game server finished ' + '-' * 50 + '\n')
        self.is_terminated = True
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

    def reset_user(self, user=None):
        if user is None:
            pass
