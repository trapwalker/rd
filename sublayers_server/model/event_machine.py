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
from sublayers_server.model.events import event_deco
from sublayers_server.model.async_tools import async_deco2
import sublayers_server.model.registry_me.classes  # todo: autoregistry classes
from sublayers_server.model.vectors import Point
from sublayers_server.model.registry_me.tree import get_global_registry
from sublayers_common.user_profile import User as UserProfile
from sublayers_common.ctx_timer import Timer
from sublayers_common.handlers.base import BaseHandler


import os
import sys
import random
import tornado.ioloop
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


class EServerAlreadyStarted(errors.EIllegal):
    pass


class EServerIsNotStarted(errors.EIllegal):
    pass

########################################################################################################################
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

        self.reg = get_global_registry(path=options.world_path, reload=options.reg_reload, save_loaded=True)

    def __getstate__(self):
        d = self.__dict__.copy()
        return d

    @staticmethod
    def get_time():
        return get_time()

    @async_deco2(error_callback=lambda error: log.warning('Read Zone: on_error(%s)', error))
    def init_zones(self, time):
        zones = self.reg.get('/registry/zones').subnodes
        for zone in sorted(zones, key=lambda a_zone: a_zone.order_key):
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
        # todo: регистрация эффектов, должно быть обязательно раньше зон
        # создание зон
        if options.zones_disable:
            log.info('Zones activation disabled')
        else:
            self.init_zones(time=self.get_time())

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
        log.debug('==== Server save ' + '=' * 33)
        with Timer(logger=None) as t:
            for agent in self.agents.values():
                agent.save(time=time)

            log.debug('Server save DONE ({:.3f}s).'.format(t.duration))

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
            ev_count_performed=ev_count_performed / options.server_stat_log_interval,
            max_ev_lag=max_ev_lag,
            average_ev_lag=average_ev_lag,
            mes_count=mes_count / options.server_stat_log_interval,
            mes_dur=mes_dur / options.server_stat_log_interval,
        )
        self.logger_statlog.info(log_str)
        self.server_stat_log(time=self.get_time() + options.server_stat_log_interval, server=self)

        self.server_stat_log_events(event)


    def server_stat_log_events(self, event):
        # Формат CSV-файла
        # time; EventName; count; perf_time_average; perf_time_max; lag_time_average; lag_time_max; perf_time_summ
        def get_event_str(events_metrics, event_name):
            e = events_metrics[event_name]
            count = len(e["event_perf_time_interval"])
            average_perf_time = 0
            average_lag_time = 0
            summ_perf_time = 0
            max_perf_time = 0
            max_lag_time = 0
            if count > 0:
                summ_perf_time = sum(e["event_perf_time_interval"])
                max_perf_time = max(e["event_perf_time_interval"])
                average_perf_time = summ_perf_time / count
                if e.get("event_lag_interval", None) and len(e["event_lag_interval"]) > 0:
                    max_lag_time = max(e["event_lag_interval"])
                    average_lag_time = sum(e["event_lag_interval"]) / count

            e["event_perf_time_interval"] = []
            e["event_lag_interval"] = []

            return "{event_name};{count};{perf_time_average:.5f};{perf_time_max:.5f};{perf_time_summ:.5f};{lag_time_max:.5f};{lag_time_average:.5f};".format(
                event_name=event_name,
                count= 1. * count / options.server_stat_log_interval,
                perf_time_average=average_perf_time,
                perf_time_max=max_perf_time,
                perf_time_summ=summ_perf_time / options.server_stat_log_interval,
                lag_time_average=average_lag_time,
                lag_time_max=max_lag_time,
            )

        log_str = "{};".format(event.time)

        events_metrics = event.events_metrics
        for event_name in events_metrics.keys():
            log_str = "{}{}".format(log_str, get_event_str(events_metrics, event_name))

        handlers_metrics = BaseHandler.handlers_metrics
        for event_name in handlers_metrics.keys():
            log_str = "{}{}".format(log_str, get_event_str(handlers_metrics, event_name))

        log_str = "{}{}".format(log_str, get_event_str(
            events_metrics={
                "OutherLoop": {
                    "event_perf_time_interval": self._outher_loop_time_arr
                }
            },
            event_name="OutherLoop")
        )
        self._outher_loop_time_arr = []

        self.logger_statlog_events.info(log_str)

########################################################################################################################
class LocalServer(Server):
    def __init__(self, app=None, **kw):
        super(LocalServer, self).__init__(**kw)
        self.api = ServerAPI(self)
        self.thread = None
        self.is_terminated = False
        self.app = app
        self.periodic = None
        self.outher_loop_time = 0
        self._outher_loop_time_arr = []
        # stat loggers init
        self.logger_statlog = logging.getLogger('statlog')
        self.logger_statlog_events = logging.getLogger('statlog_events')

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
        time = self.get_time()
        self._outher_loop_time_arr.append(time - self.outher_loop_time)
        if len(message_queue):
            count = len(message_queue)
            with Timer(name='message_send_timer', log_start=None, logger=None, log_stop=None) as message_send_timer:
                while message_queue:
                    message_queue.popleft().send()  # todo: async sending by ioloop
            # todo: mass sending optimizations over separated chat server
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
        self.outher_loop_time = self.get_time()

    def start(self):
        if options.server_stat_log_interval > 0:
            self.server_stat_log(server=self, time=self.get_time() + options.server_stat_log_interval)

        # self.periodic = tornado.ioloop.PeriodicCallback(callback=self.event_loop, callback_time=10)
        # self.periodic.start()
        self.ioloop.add_callback(callback=self.event_loop)
        self.outher_loop_time = self.get_time()
        self.is_terminated = False
        log.info('---- Game server started: ' + '-' * 24)
        log.info('    DB     : %s', options.db)
        log.info('    Mode   : %s', options.mode)
        log.info('    Service: %s', options.service_name)
        log.info('    Port   : %s', options.port)
        log.info('    PID    : %s', os.getpid())
        log.info('-' * 50)

    def stop(self, timeout=None):
        # self.periodic.stop()
        log.info('---- Game server finished ' + '-' * 25 + '\n')
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

    # def load_test_accounts(self):
    #     from sublayers_server.model.registry_me.classes.agents import Agent
    #     from sublayers_server.model.ai_quick_agent import AIQuickAgent
    #     import os
    #     from os.path import isfile, join
    #     import yaml
    #
    #     file_name = join(os.getcwd(), 'account_test.yaml')
    #     if not isfile(file_name):
    #         log.warning('File account_test.yaml not found.')
    #         return
    #
    #     with open(file_name) as data_file:
    #         tester_accounts = yaml.load(data_file).get('accounts', [])
    #
    #     if not tester_accounts:
    #         log.warning('account_test.yaml is not contains any accounts')
    #     # Создать ботов
    #     avatar_list = self.reg.get('/registry/world_settings').avatar_list
    #     role_class_list = self.reg.get('/registry/world_settings').role_class_order
    #     for acc in tester_accounts:
    #         # Найти или создать профиль
    #         name = acc['nickname']
    #         user = UserProfile.get_by_name(name=name)
    #         if user is None:
    #             user = UserProfile(
    #                 name=name,
    #                 email=acc['login'],
    #                 raw_password=str(acc['password']),
    #                 avatar_link=random.choice(avatar_list),
    #                 registration_status='register',
    #                 is_tester=True,
    #             ).save()
    #             log.info('Test account created: %s', acc['login'])
    #
    #         # todo: ##REFACTORING
    #         # Создать AIQuickAgent
    #         agent_exemplar = Agent.objects.flter(user_id=user.pk, quick_flag=options.mode == 'quick').first()
    #         if agent_exemplar is None:
    #             agent_exemplar = Agent(
    #                 user_id=user.pk,
    #                 login=user.name,
    #                 quick_flag=options.mode == 'quick',
    #                 teaching_flag=False,
    #                 profile=self.reg.get('registry/agents/user/quick').instantiate(  # todo: get right User parent
    #                     name=str(user.pk),
    #                     role_class=random.choice(role_class_list),
    #                     karma=random.randint(-80, 80),
    #                     _exp=1005,
    #                 ),
    #             )
    #             agent_exemplar.profile.driving.value = 20
    #             agent_exemplar.profile.shooting.value = 20
    #             agent_exemplar.profile.masking.value = 20
    #             agent_exemplar.profile.leading.value = 20
    #             agent_exemplar.profile.trading.value = 20
    #             agent_exemplar.profile.engineering.value = 20
    #             agent_exemplar.save()


########################################################################################################################
class BasicLocalServer(LocalServer):
    def load_world(self):
        super(BasicLocalServer, self).load_world()

        # загрузка радиоточек
        t = self.get_time()
        towers_root = self.reg.get('/registry/poi/radio_towers')
        for rt_exm in towers_root.subnodes:
            RadioPoint(time=t, example=rt_exm, server=self)

        # загрузка городов
        towns_root = self.reg.get('/registry/poi/locations/towns')
        for t_exm in towns_root.subnodes:
            Town(time=t, server=self, example=t_exm)

        # загрузка заправочных станций
        gs_root = self.reg.get('/registry/poi/locations/gas_stations')
        for gs_exm in gs_root.subnodes:
            GasStation(time=t, server=self, example=gs_exm)

       # todo: Сделать загрузку стационарных точек радиации


########################################################################################################################
class QuickLocalServer(LocalServer):
    def load_world(self):
        super(QuickLocalServer, self).load_world()
        t = self.get_time()
        # Установка параметров быстрой игры
        world_settings = self.reg.get('/registry/world_settings')
        self.quick_game_start_pos = world_settings.quick_game_start_pos.as_point()
        self.quick_game_play_radius = world_settings.quick_game_play_radius
        self.quick_game_respawn_bots_pos = world_settings.quick_game_respawn_bots_pos.as_point()
        self.quick_game_respawn_bots_radius = world_settings.quick_game_respawn_bots_radius
        self.quick_game_death_radius = self.quick_game_play_radius * 20

        # Установка POI объектов быстрой игры
        ## загрузка радиоточки
        tower = self.reg.get('/registry/poi/quick_game_poi/quick_game_radio_tower', None)
        if tower:
            tower.position = self.quick_game_start_pos
            RadioPoint(time=t, example=tower, server=self)

        ## Установка точки радиации-быстрой игры
        quick_rad = self.reg.get('/registry/poi/quick_game_poi/quick_game_radiation_area', None)
        if quick_rad:
            quick_rad.p_observing_range = self.quick_game_death_radius
            quick_rad.position = self.quick_game_start_pos
            StationaryRadiation(time=t, example=quick_rad, server=self)

        quick_rad_anti = self.reg.get('/registry/poi/quick_game_poi/quick_game_radiation_area_anti', None)
        if quick_rad_anti:
            quick_rad_anti.p_observing_range = self.quick_game_play_radius
            quick_rad_anti.position = self.quick_game_start_pos
            StationaryRadiation(time=t, example=quick_rad_anti, server=self)

        ## Установка точек-респаунов
        respawns_root = self.reg.get('/registry/poi/quick_game_poi/quick_game_respawn')
        for rs_exm in respawns_root.subnodes:
            respawns_root.position = self.quick_game_start_pos
            MapRespawn(time=t, example=rs_exm, server=self)


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
        with Timer(logger=None) as tm:
            self.load_ai_quick_bots()
            log.info('Quick bots loaded DONE ({:.3f}s)'.format(tm.duration))

    def load_ai_quick_bots(self):
        from sublayers_server.model.registry_me.classes.agents import Agent
        from sublayers_server.model.ai_quick_agent import AIQuickAgent

        # todo: ##OPTIMIZE
        bot_count = self.reg.get('/registry/world_settings').quick_game_bot_count or 0
        # Создать ботов
        avatar_list = self.reg.get('/registry/world_settings').avatar_list
        role_class_list = self.reg.get('/registry/world_settings').role_class_order
        car_proto_list = self.quick_game_bot_cars_proto
        car_proto_list_len = len(car_proto_list)
        current_machine_index = 0
        bots_names = self.reg.get('/registry/world_settings').quick_game_bots_nick
        for i in xrange(bot_count):
            # Найти или создать профиль
            name = bots_names[i] if bots_names and i < len(bots_names) else 'quick_bot_{}'.format(i)
            user = UserProfile.get_by_name(name=name)
            if user is None:
                user = UserProfile(
                    name=name,
                    email='quick_bot_{}@1'.format(i),
                    raw_password='1',
                    avatar_link=random.choice(avatar_list),
                ).save()

            # Создать AIQuickAgent
            agent_exemplar = Agent.objects.filter(user_id=str(user.pk), quick_flag=options.mode == 'quick').first()
            if agent_exemplar is None:
                assert self.quick_game_bot_agents_proto
                agent_exemplar = Agent(
                    user_id=str(user.pk),
                    login=user.name,
                    quick_flag=options.mode == 'quick',
                    profile=random.choice(self.quick_game_bot_agents_proto).instantiate(
                        name=str(user.pk),
                        role_class=random.choice(role_class_list),
                        karma=random.randint(-80, 80),
                        _exp=1005,
                    ),
                )
                # todo: ##REFACTORING
                agent_exemplar.profile.driving.value = random.randint(20, 40)
                agent_exemplar.profile.shooting.value = random.randint(20, 40)
                agent_exemplar.profile.masking.value = random.randint(20, 40)
                agent_exemplar.profile.leading.value = random.randint(20, 40)
                agent_exemplar.profile.trading.value = random.randint(20, 40)
                agent_exemplar.profile.engineering.value = random.randint(20, 40)
                agent_exemplar.save()

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
