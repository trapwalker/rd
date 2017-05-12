# -*- coding: utf-8 -*-
from __future__ import print_function
import logging.config

log = logging.getLogger(__name__)

from sublayers_server.model.server_api import ServerAPI
from sublayers_server.model.utils import get_uid, TimelineQueue, get_time
from sublayers_server.model.stat_log import StatLogger
from sublayers_server.model.visibility_manager import VisibilityManager
from sublayers_server.model import errors

from sublayers_server.model.map_location import RadioPoint, Town, GasStation, MapRespawn
from sublayers_server.model.radiation import StationaryRadiation
from sublayers_server.model.events import LoadWorldEvent, event_deco
from sublayers_server.model.async_tools import async_deco2
import sublayers_server.model.registry.classes  # todo: autoregistry classes
from sublayers_server.model.vectors import Point

from sublayers_server.model.registry.tree import Root

from sublayers_common.user_profile import User as UserProfile
from sublayers_common.ctx_timer import Timer


import os
import sys
import random
import tornado.ioloop
import tornado.gen
from time import sleep
from threading import Thread
from collections import deque
from tornado.options import options  # todo: Пробросить опции в сервер при создании оного
from functools import partial, wraps

MAX_SERVER_SLEEP_TIME = 0.1


def async_call_deco(f):
    wraps(f)

    def closure(*av, **kw):
        # callback = kw.pop('callback', None)  # todo: make result returning by callback
        ff = partial(f, *av, **kw)
        tornado.ioloop.IOLoop.instance().add_callback(ff)

    return closure


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
        self.server_mode = options.mode
        # self.reg.load(path=os.path.join(options.world_path, u'registry')) # todo: (!!) async call

        self.zones = []

        self.stat_log = StatLogger()
        self.visibility_mng = VisibilityManager(server=self)
        self.poi_loot_objects_life_time = 600  # Время жизни лута на карте для обычного режима

        # todo: QuickGame settings fix it
        if options.mode == 'quick':
            self.poi_loot_objects_life_time = 30  # Время жизни лута на карте для режима быстрой игры
            self.quick_game_cars_proto = []
            self.quick_game_bot_cars_proto = []
            self.quick_game_bot_agents_proto = []

            self.quick_game_start_pos = Point(0, 0)
            self.quick_game_play_radius = 0
            self.quick_game_respawn_bots_pos = Point(0, 0)
            self.quick_game_respawn_bots_radius = 0
            self.quick_game_death_radius = 0

            # self.ioloop.add_callback(callback=self.load_registry)

    @async_call_deco
    def load_registry(self):
        def load_registry_done_callback(all_registry_items):
            self.reg = Root.objects.get_cached('reg:///registry')
            log.debug('Registry loaded successfully: %s nodes', len(all_registry_items))
            self.load_world()

        # Root.load(path=os.path.join(options.world_path), load_registry_done_callback)
        Root.objects.find_all(callback=load_registry_done_callback)

    def __getstate__(self):
        d = self.__dict__.copy()
        return d

    @staticmethod
    def get_time():
        return get_time()

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

    def load_world(self):
        LoadWorldEvent(server=self, time=self.get_time()).post()  # todo: remove deprecated event

    def on_load_world(self, event):
        # todo: регистрация эффектов, должно быть обязательно раньше зон

        # создание зон
        if not options.zones_disable:
            self.init_zones(time=event.time)
        else:
            log.info('Zones activation disabled')

        if options.mode == 'basic':
            self.on_load_poi(event)
        elif options.mode == 'quick':
            # Установка стартовых значений
            world_settings = self.reg['world_settings']
            self.quick_game_start_pos = world_settings.quick_game_start_pos.as_point()
            self.quick_game_play_radius = world_settings.quick_game_play_radius
            self.quick_game_respawn_bots_pos = world_settings.quick_game_respawn_bots_pos.as_point()
            self.quick_game_respawn_bots_radius = world_settings.quick_game_respawn_bots_radius
            self.quick_game_death_radius = self.quick_game_play_radius * 20

            # Установка POI объектов быстрой игры
            self.on_load_poi_quick_mode(event)

            # Создание экземпляров машинок игроков для быстрой игры
            for car_proto in world_settings.quick_game_cars:
                self.quick_game_cars_proto.append(car_proto)

            # Создание экземпляров машинок ботов для быстрой игры
            for car_proto in world_settings.quick_game_bot_cars:
                self.quick_game_bot_cars_proto.append(car_proto)

            # Получение экземпляров агентов ботов для быстрой игры
            for agent_ex in world_settings.quick_game_bot_agents:
                self.quick_game_bot_agents_proto.append(agent_ex)

            # Создание AIQuickBot'ов
            self.ioloop.add_callback(callback=self.load_ai_quick_bots)

            # Создание Тестовых аккаунтов
            # self.ioloop.add_callback(callback=self.load_test_accounts)

        print('Load world complete !')
        if options.server_stat_log_interval > 0:
            self.server_stat_log(server=self, time=event.time + options.server_stat_log_interval)
            self.logger_statlog = logging.getLogger('statlog')

    def on_load_poi(self, event):
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

            # todo: Сделать загрузку стационарных точек радиации

    def on_load_poi_quick_mode(self, event):
        # загрузка радиоточки
        tower = self.reg['poi/quick_game_poi/quick_game_radio_tower']
        if tower:
            tower.position = self.quick_game_start_pos
            RadioPoint(time=event.time, example=tower, server=self)

        # Установка точки радиации-быстрой игры
        quick_rad = self.reg['poi/quick_game_poi/quick_game_radiation_area']
        if quick_rad:
            quick_rad.p_observing_range = self.quick_game_death_radius
            quick_rad.position = self.quick_game_start_pos
            StationaryRadiation(time=event.time, example=quick_rad, server=self)
        quick_rad_anti = self.reg['poi/quick_game_poi/quick_game_radiation_area_anti']
        if quick_rad_anti:
            quick_rad_anti.p_observing_range = self.quick_game_play_radius
            quick_rad_anti.position = self.quick_game_start_pos
            StationaryRadiation(time=event.time, example=quick_rad_anti, server=self)

        # Установка точек-респаунов
        respawns_root = self.reg['poi/quick_game_poi/quick_game_respawn']
        for rs_exm in respawns_root:
            respawns_root.position = self.quick_game_start_pos
            MapRespawn(time=event.time, example=rs_exm, server=self)

    @tornado.gen.coroutine
    def load_ai_quick_bots(self):
        from sublayers_server.model.registry.classes.agents import Agent
        from sublayers_server.model.ai_quick_agent import AIQuickAgent

        bot_count = self.reg['world_settings'].quick_game_bot_count
        if not bot_count:
            bot_count = 0
        # Создать ботов
        avatar_list = self.reg['world_settings'].avatar_list
        role_class_list = self.reg['world_settings'].role_class_order
        car_proto_list = self.quick_game_bot_cars_proto
        car_proto_list_len = len(car_proto_list)
        current_machine_index = 0
        bots_names = self.reg['world_settings'].quick_game_bots_nick
        for i in range(0, bot_count):
            # Найти или создать профиль
            name = 'quick_bot_{}'.format(i) if i >= len(bots_names) else bots_names[i]
            user = yield UserProfile.get_by_name(name=name)
            if user is None:
                user = UserProfile(name=name, email='quick_bot_{}@1'.format(i), raw_password='1')
                user.avatar_link = avatar_list[random.randint(0, len(avatar_list) - 1)]
                yield user.save()

            # Создать AIQuickAgent
            agent_exemplar = yield Agent.objects.get(profile_id=str(user._id))
            if agent_exemplar is None:
                agent_exemplar = self.quick_game_bot_agents_proto[
                    random.randint(0, len(self.quick_game_bot_agents_proto) - 1)]
                agent_exemplar = agent_exemplar.instantiate(
                    login=user.name,
                    profile_id=str(user._id),
                    name=str(user._id),
                    fixtured=False,
                )
                yield agent_exemplar.load_references()

                agent_exemplar.role_class = role_class_list[random.randint(0, len(role_class_list) - 1)]
                agent_exemplar.set_karma(time=self.get_time(), value=random.randint(-80, 80))
                agent_exemplar.set_exp(time=self.get_time(), value=1005)
                agent_exemplar.driving.value = random.randint(20, 40)
                agent_exemplar.shooting.value = random.randint(20, 40)
                agent_exemplar.masking.value = random.randint(20, 40)
                agent_exemplar.leading.value = random.randint(20, 40)
                agent_exemplar.trading.value = random.randint(20, 40)
                agent_exemplar.engineering.value = random.randint(20, 40)
                yield agent_exemplar.save(upsert=True)

            # log.debug('AIQuickAgent agent exemplar: %s', agent_exemplar)
            car_proto = car_proto_list[current_machine_index % car_proto_list_len]
            current_machine_index += 1
            ai_agent = AIQuickAgent(
                server=self,
                user=user,
                time=self.get_time(),
                example=agent_exemplar,
                car_proto=car_proto
            )

    @tornado.gen.coroutine
    def load_test_accounts(self):
        from sublayers_server.model.registry.classes.agents import Agent
        from sublayers_server.model.ai_quick_agent import AIQuickAgent
        import os
        from os.path import isfile, join
        import yaml

        file_name = join(os.getcwd(), 'account_test.yaml')
        if isfile(file_name):
            with open(file_name) as data_file:
                data = yaml.load(data_file)
                if data.get('accounts', None) and len(data['accounts']):
                    tester_accounts = data['accounts']
                else:
                    log.warning('Tester Accounts not found in file account_test.yaml')
                    return
        else:
            log.warning('File account_test.yaml not found.')
            return

        tester_count = len(tester_accounts)
        # Создать ботов
        avatar_list = self.reg['world_settings'].avatar_list
        role_class_list = self.reg['world_settings'].role_class_order
        for i in range(0, tester_count):
            # Найти или создать профиль
            name = tester_accounts[i]['nickname']
            user = yield UserProfile.get_by_name(name=name)
            if user is None:
                user = UserProfile(name=name, email=tester_accounts[i]['login'], raw_password=str(tester_accounts[i]['password']))
                user.avatar_link = avatar_list[random.randint(0, len(avatar_list) - 1)]
                user.registration_status = 'register'
                user.is_tester = True
                yield user.save()
                log.info('Test account created: %s', tester_accounts[i]['login'])

            # Создать AIQuickAgent
            agent_exemplar = yield Agent.objects.get(profile_id=str(user._id))
            if agent_exemplar is None:
                agent_exemplar = self.reg['agents/user/quick'].instantiate(
                    login=user.name,
                    profile_id=str(user._id),
                    name=str(user._id),
                    fixtured=False,
                )
                yield agent_exemplar.load_references()
                yield agent_exemplar.save(upsert=True)
                agent_exemplar.role_class = role_class_list[random.randint(0, len(role_class_list) - 1)]
                agent_exemplar.set_karma(time=self.get_time(), value=random.randint(-80, 80))
                agent_exemplar.set_exp(time=self.get_time(), value=1005)
                agent_exemplar.driving.value = 20
                agent_exemplar.shooting.value = 20
                agent_exemplar.masking.value = 20
                agent_exemplar.leading.value = 20
                agent_exemplar.trading.value = 20
                agent_exemplar.engineering.value = 20
                agent_exemplar.quick_flag = True
                agent_exemplar.teaching_flag = False
                yield agent_exemplar.save(upsert=True)

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
            # s_agents_on=st.get_metric('s_agents_on'),
            s_agents_on=len(self.app.clients),
            s_observers_all=st.get_metric('s_observers_all'),
            s_observers_on=st.get_metric('s_observers_on'),
            s_events_all=st.get_metric('s_events_all'),
            s_events_on=st.get_metric('s_events_on'),
            s_events_lag_max=st.get_metric('s_events_lag_max'),
            s_events_lag_max_comment=st.get_metric_obj('s_events_lag_max').comment,
            s_events_lag_mid=st.get_metric('s_events_lag_mid'),
            s_message_send_max=st.get_metric('s_message_send_max')
        )

    memsize = sys.getsizeof

    def save(self, time):
        log.debug('=' * 10 + ' Server SAVE start ' + '=' * 10)
        for agent in self.agents.values():
            agent.save(time=time)
        log.debug('=' * 10 + ' Server SAVE end   ' + '=' * 10)

    @event_deco
    def server_stat_log(self, event, **kw):
        # Формат CSV-файла
        # time; observers; agent_online; ev_count_performed; max_ev_lag; average_ev_lag; mes_count; mes_dur;
        st = self.stat_log
        time = event.time
        observers = st.get_metric('s_observers_on')
        agent_online = len(self.app.clients)

        max_ev_lag, average_ev_lag, ev_count_performed = st.get_metric('s_events_stat_log')
        st.get_metric_obj('s_events_stat_log').clear()

        mes_count = st.get_metric("s_messages_stat_log_count")
        mes_dur = st.get_metric("s_messages_stat_log_dur")

        self.stat_log.s_messages_stat_log_dur(time=time, delta=-mes_dur)
        self.stat_log.s_messages_stat_log_count(time=time, delta=-mes_count)
        # todo: write dict to log extra
        log_str = "{time};{observers};{agent_online};{ev_count_performed};{max_ev_lag};{average_ev_lag};{mes_count};{mes_dur}".format(
            time=time,
            observers=observers,
            agent_online=agent_online,
            ev_count_performed=ev_count_performed,
            max_ev_lag=max_ev_lag,
            average_ev_lag=average_ev_lag,
            mes_count=mes_count,
            mes_dur=mes_dur,
        )
        self.logger_statlog.info(log_str)
        self.server_stat_log(time=self.get_time() + options.server_stat_log_interval, server=self)


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

        if len(message_queue):
            count = len(message_queue)
            with Timer(name='message_send_timer', log_start=None, logger=None, log_stop=None) as message_send_timer:
                while message_queue:
                    message_queue.popleft().send()  # todo: async sending by ioloop
            # todo: mass sending optimizations over separated chat server
            time=self.get_time()
            self.stat_log.s_message_send_max(time=time, value=message_send_timer.duration)
            self.stat_log.s_messages_stat_log_count(time=time, delta=count)
            self.stat_log.s_messages_stat_log_dur(time=time, delta=message_send_timer.duration)

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
