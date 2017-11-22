# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Object
from sublayers_server.model.party import PartyInviteDeleteEvent
from sublayers_server.model.units import Unit, ExtraMobile
from sublayers_server.model.weapon_objects.mine import BangMine
from counterset import CounterSet
from map_location import MapLocation, Town
from sublayers_server.model.registry_me.uri import URI
from sublayers_server.model.registry_me.tree import Node
from sublayers_server.model.registry_me.classes.inventory import LoadInventoryEvent
from sublayers_server.model.registry_me.classes.trader import Trader

# from sublayers_server.model.utils import SubscriptionList
from sublayers_server.model.messages import (
    PartyErrorMessage, See, Out, QuickGameChangePoints, QuickGameArcadeTextMessage, TraderAgentAssortmentMessage,
    SetObserverForClient, Die, QuickGameDie, StartQuickGame, SetMapCenterMessage, UserExampleCarInfo, TraderInfoMessage,
    ChangeStealthIndicator, CarRPGInfo
)
from sublayers_server.model.game_log_messages import InventoryChangeLogMessage
from sublayers_server.model.vectors import Point
from sublayers_server.model import quest_events
from sublayers_server.model.events import event_deco, Event, AgentTestEvent
from sublayers_server.model.parking_bag import ParkingBag
from sublayers_server.model.agent_api import AgentAPI
from sublayers_server.model.quest_events import OnMakeDmg, OnActivateItem, OnGetDmg
from sublayers_server.model.utils import NameGenerator
from sublayers_common.site_locale import locale
from sublayers_common.adm_mongo_logs import AdminLogRecord

from ctx_timer import Timer
from tornado.options import options
from itertools import chain
from random import randint, choice


# todo: make agent offline status possible
class Agent(Object):
    __str_template__ = '<{self.dead_mark}{self.classname} #{self.id} AKA {self._login!r}>'

    # todo: Перенести аргумент user  в конструктор UserAgent
    # todo: Делать сохранение неюзер-агентов в особую коллекцию без идентификации по профилю
    def __init__(self, user, time, example, login='', party=None, **kw):
        """
        @type example: sublayers_server.model.registry_me.classes.agents.Agent
        """
        super(Agent, self).__init__(time=time, **kw)
        self.example = example
        if example:
            example.profile._agent_model = self
        self._disconnect_timeout_event = None
        # self.subscriptions = SubscriptionList()
        self.observers = CounterSet()
        self.api = None
        self.connection = None
        self.user = user
        self._avatar_link = None
        if user is not None:
            self.server.agents[str(user.pk)] = self  #todo: Перенести помещение в коллекцию в конец инициализации
            self.server.agents_by_name[user.name] = self
            self._login = user.name
        else:
            self._login = login or self.generate_fake_login()
            if self.server.agents_by_name.get(self._login, None) is None:
                self.server.agents_by_name[self._login] = self
            else:
                raise Exception(text='Not uniq agent name')

        self._logger = self.setup_logger()
        self._adm_logs = []  # Список логов для сохранения в базу при сохранении агента
        self.car = None
        self.slave_objects = []  # дроиды
        """@type: list[sublayers_server.model.units.Bot]"""
        self.party = None
        self.invites = []
        if party is not None:
            party.include(agent=self, time=time)

        self._auto_fire_enable = None  # нужна, чтобы сохранить состояние авто-стрельбы перед партийными изменениями

        self.chats = []

        # Бартер между игроками
        self.barters = []  # бартеры в которых агент - участник

        # todo: subscriber list ##quest

        # статистика сервера
        self.server.stat_log.s_agents_all(time=time, delta=1.0)

        # текущий город, если агент не в городе то None
        self._current_location = None
        self.current_location = example.profile.current_location
        self.watched_locations = [] # Список MapLocation, которые видят агента (редактируется в MapLocation)

        self.inventory = None  # Тут будет лежать инвентарь машинки когда агент в городе
        self.parking_bag = None  # Инвентарь выбранной машинки в паркинге (Специальный объект, у которого есть inventory)

        self.log.info('Agent Created %s', self)

        self.connection_times = []  # times connections for this agent
        self.min_connection_time = 0  #

        self.resolution_scale = 'big'  # Размер разрешения текущего клиента

    def generate_fake_login(self):
        max_iterations = 500
        for i in xrange(0, max_iterations):
            name_pair = NameGenerator.pair()
            login = u'{}_{}_{}'.format(name_pair[0], name_pair[1], randint(100, 999))
            if self.server.agents_by_name.get(login, None) is None:
                return login
        raise Exception(text='dont generate uniq agent name')

    @property
    def avatar_link(self):
        if self._avatar_link:
            return self._avatar_link
        if self.user:
            self._avatar_link = self.user.avatar_link
        else:
            self._avatar_link = choice(self.server.reg.get('/registry/world_settings').avatar_list)
        return self._avatar_link

    def tp(self, time, location, radius=None):
        self.current_location = location
        # todo: Реализовать телепортацию в заданную точку карты по координатам ##realize ##quest

    def die(self, time):
        self.hit(time=time, value=1000)  # todo: устранить магическую константу ##crutch

    def hit(self, time, value):
        if self.car:
            self.car.set_hp(time=time, dhp=value)

    def give(self, time, items):
        # todo: ##realize ##quest
        pass

    def drop(self, time, items):
        # todo: ##realize ##quest
        pass

    def confiscate(self, time, items):
        # todo: ##realize ##quest
        pass

    def say(self, time, text, npc, dest):
        # todo: ##realize ##quest
        pass

    @property
    def log(self):
        return self._logger

    def adm_log(self, type, text):
        if self.user:
            AdminLogRecord(user=self.user, type=type, text=text).post(server=self.server)

    def setup_logger(self, level=logging.ERROR):
        from sublayers_server.log_setup import (
            logger, handler, formatter_simple_for_agent, local_path, SUFFIX_BY_MODE, handler_errors_file, handler_screen,
        )
        import logging.handlers
        user = self.user
        d = dict(
            mode=user and (user.quick and 'quick' or 'basic') or '_wrong_',
            uid=user and user.pk,
            login=self._login,
            path_suffix=SUFFIX_BY_MODE[options.mode],
        )
        logger_name = 'agents.{mode}._{uid}_{login}'.format(**d)
        log_file = 'log{path_suffix}/agents/agent_{uid}_[{login}].log'.format(**d)

        l = logger(logger_name, level=level, propagate=0, handlers=[
            handler_errors_file,
            handler(
                fmt=formatter_simple_for_agent,
                cls=logging.handlers.TimedRotatingFileHandler,
                when='midnight',
                backupCount=5,
                encoding='utf-8',
                filename=local_path(log_file),
                level=level,
                delay=True,
            ),
        ])
        if options.show_agents_log:
            l.add_handler(handler_screen)

        return l

    def __getstate__(self):
        d = self.__dict__.copy()
        del d['connection']
        return d

    @property
    def current_location(self):
        return self._current_location

    @current_location.setter
    def current_location(self, value):
        if value is None:
            location = None
            example_location = None
        elif isinstance(value, URI):
            location = MapLocation.get_location_by_uri(value)
            example_location = value.resolve()
        elif isinstance(value, MapLocation):
            location = value
            example_location = value.example
        elif isinstance(value, Node):
            assert value.uri
            location = MapLocation.get_location_by_uri(value.uri)
            example_location = value
        else:
            raise Exception('ILLEGAL ERROR: Wrong location type!')

        # todo: реализовать возможность устанавливать в качестве локации координаты? ##realize ##quest
        self._current_location = location
        self.example.profile.current_location = example_location

    @property
    def balance(self):
        return self.example.profile.balance

    def on_load(self):
        agent_profile = self.example.profile
        for quest in chain(agent_profile.quests_active, agent_profile.quests_unstarted):
            timers = quest.timers.values()
            quest.timers = {}
            for timer in timers:
                quest_events.OnTimer(
                    server=self.server,
                    time=timer.time,
                    quest=quest,
                    name=timer.name,
                ).post()

    def on_save(self, time):
        with Timer() as tm:
            agent_example = self.example
            agent_example.login = self._login  # todo: Не следует ли переименовать поле example.login?
            if self.car:
                # todo: review (логичнее бы тут поставить self.car.save(time), но тогда возможно теряется смысл следующей строки)
                self.car.on_save(time)
                agent_example.profile.car = self.car.example
            # elif self.current_location is None:  # todo: wtf ?!
            #     self.example.profile.car = None
            # todo: save chats, party...
            # agent_example.delete()  # TODO: Добиться правильного пересохранения агента
            agent_example.save()
            #agent_example.save(force_insert=True)

            # Сохранение накопленных логов
            with Timer() as tmlogs:
                for l in self._adm_logs:
                    l.post()  # post without params = save to db
                self._adm_logs = []

            log.debug('Agent %r saved (%.4fs): logs: %.4fs', agent_example.login, tm.duration, tmlogs.duration)



    @property
    def is_online(self):
        return self.connection is not None

    @property
    def adm_info(self):
        connection = self.connection
        user = self.user
        return dict(
            is_online=self.is_online,
            ip=connection and connection.request.remote_ip,
            name=self._login,
            user=user and user.adm_info,
        )

    def add_observer(self, observer, time):
        if not self.is_online:
            return
        # add _self_ into to the all _visible objects_ by _observer_
        self.observers[observer] += 1
        observer.watched_agents[self] += 1
        self.on_see(time=time, subj=observer, obj=observer)
        for vo in observer.visible_objects:
            self.on_see(time=time, subj=observer, obj=vo)
        SetObserverForClient(agent=self, time=time, obj=observer, enable=True).post()

    def drop_observer(self, observer, time):
        if not self.is_online:
            return
        # remove _self_ from all _visible objects_ by _observer_
        for vo in observer.visible_objects:
            self.on_out(time=time, subj=observer, obj=vo)
        self.on_out(time=time, subj=observer, obj=observer)
        observer.watched_agents[self] -= 1
        self.observers[observer] -= 1
        if self.observers[observer] == 0:
            SetObserverForClient(agent=self, time=time, obj=observer, enable=False).post()

    def as_dict(self, **kw):
        d = super(Agent, self).as_dict(**kw)
        d.update(
            login=self._login,  # todo: Переименовать login
            party=self.party.as_dict() if self.party else None,
            balance=self.balance,
        )
        return d

    def append_obj(self, obj, time):
        self.log.info('append_obj {}'.format(obj))
        if obj not in self.slave_objects:
            self.slave_objects.append(obj)
            self.add_observer(observer=obj, time=time)
            if self.party:
                self.party.add_observer_to_party(observer=obj, time=time)

    def drop_obj(self, obj, time):
        self.log.info('drop_obj {}'.format(obj))
        if obj in self.slave_objects:
            if self.party:
                self.party.drop_observer_from_party(observer=obj, time=time)
            self.drop_observer(observer=obj, time=time)
            self.slave_objects.remove(obj)

    def append_car(self, car, time):  # specific
        self.log.info('append_car {}'.format(car))
        if not self.car:
            self.car = car
            car.owner = self
            self.add_observer(observer=car, time=time)
            if self.party:
                # сообщить пати, что этот обсёрвер теперь добавлен на карту
                self.party.add_observer_to_party(observer=car, time=time)
            # сообщить квестам, что добавилась машинка
            # todo: refactor this call
            self.example.profile.on_event(event=Event(server=self.server, time=time), cls=quest_events.OnAppendCar)
            # работа с инвентарём агента: просто включить подписку
            if car.inventory:
                self.inventory = car.inventory
                self.inventory.add_change_call_back(self.on_change_inventory_cb)
            UserExampleCarInfo(agent=self, time=time).post()

    def drop_car(self, car, time, drop_owner=True):
        self.log.info('drop_car {}  time={}'.format(car, time))
        if car is self.car:
            if self.party:
                # сообщить пати, что этот обсёрвер теперь убран с карты
                self.party.drop_observer_from_party(observer=car, time=time)
            self.drop_observer(observer=car, time=time)
            if drop_owner:
                car.owner = None
            self.car = None
            # работа с инвентарём агента: нужно просто пока что выключить подписку
            if self.inventory:
                self.inventory.del_change_call_back(self.on_change_inventory_cb)
                self.inventory = None
            UserExampleCarInfo(agent=self, time=time).post()

    def get_connection_delay(self, time):
        # Оставляем историю коннектов за последние 1.5 минуты
        self.connection_times = [t for t in self.connection_times if time - t < 90]
        if len(self.connection_times) > 10:
            return None
        self.connection_times.append(time)
        connection_count = max(0, len(self.connection_times) - 2)
        connection_delay = min(connection_count * 15, 60)
        # каждый connection_count = 15 секунд ожидания, но не больше 1 минуты
        self.min_connection_time = time + connection_delay
        self.log.info('Connection Delay is {}'.format(connection_delay))
        return connection_delay

    def on_connect(self, connection):
        self.log.info('on_connect {}'.format(connection.request.remote_ip))
        self.adm_log(type="connect", text='Connect IP: {}'.format(connection.request.remote_ip))

        self.connection = connection
        time = self.server.get_time()
        if self._disconnect_timeout_event:
            self._disconnect_timeout_event.cancel()
            self._disconnect_timeout_event = None
            log.info('Connection of agent %s restored. Disconnect timeout cancelled.', self)
        else:
            log.info('Agent %s connected. Agents on server: %s', self, len(self.server.agents))

        if self.api:
            connection.api = self.api
        else:
            self.api = AgentAPI(agent=self)

        self.api.update_agent_api(time=time + 0.2)  # info: чтобы с клиента успело придти разрешение экрана

        # обновление статистики по онлайну агентов
        self.server.stat_log.s_agents_on(time=time, delta=1.0)

    def on_disconnect(self, connection):
        if self.connection is connection:
            self.log.info('on_disconnect {}'.format(connection))
            timeout = options.disconnect_timeout
            log.info('Agent %s disconnected. Set timeout to %ss', self, timeout)  # todo: log disconnected ip
            self.adm_log(type="connect", text='Disconnect IP: {}'.format(connection.request.remote_ip))
            # todo: Измерять длительность подключения ##defend ##realize
            t = self.server.get_time()
            self._disconnect_timeout_event = self.on_disconnect_timeout(time=t + timeout)
        else:
            log.warn('Disconnected for agent %s. But agent have another connection', self)

    @event_deco
    def on_disconnect_timeout(self, event):
        self._disconnect_timeout_event = None

        if self.car:
            self.car.displace(time=event.time)

        if self.current_location:
            self.current_location.on_exit(agent=self, event=event, dc_agent=True)

        if self.party:
            self.party.on_exclude(agent=self, time=event.time)

        # todo: выйти из пати, удалить все инвайты, а только потом удалиться из списка агентов
        _ag = self.server.agents.pop(str(self.user.pk), None)
        if _ag is None:
            log.warn("Agent %s with key %s not found in server.agents", self, self.user.pk)

        _ag = self.server.agents_by_name.pop(self._login, None)
        if _ag is None:
            log.warn("Agent %s with key %s not found in server.agents_by_name", self, self._login)

        self.server.stat_log.s_agents_on(time=event.time, delta=-1.0)
        log.info('Agent %s displaced by disconnect timeout. Agents left: %s', self, (len(self.server.agents) - 1))
        self.save(time=event.time)
        self.after_delete(event.time)

    def after_delete(self, time):
        # for clear logger
        pass

    def party_before_include(self, party, new_member, time):
        # todo: Если это событие, назвать соответственно с приставкой on
        # todo: docstring
        # party - куда включают, agent - кого включают
        if not self.is_online:
            return
        car = self.car
        if car is not None:
            self._auto_fire_enable = car.is_auto_fire_enable()
            car.fire_auto_enable(enable=False, time=time)
        for obj in self.slave_objects:
            if isinstance(obj, Unit):
                obj.fire_auto_enable(enable=False, time=time)
        # todo: Пробросить событие в квест ##quest

    def party_after_include(self, party, new_member, time, old_enable=True):
        # todo: Если это событие, назвать соответственно с приставкой on
        # todo: docstring
        # party - куда включили, agent - кого включили
        if not self.is_online:
            return
        car = self.car
        if car is not None:
            car.fire_auto_enable(time=time + 0.01, enable=self._auto_fire_enable)
        for obj in self.slave_objects:
            if isinstance(obj, Unit):
                obj.fire_auto_enable(enable=True, time=time + 0.01)
        # Пробросить событие в квест ##quest
        if new_member is self:  # Если включили себя
            e = Event(server=self.server, time=time)
            self.example.profile.on_event(event=e, cls=quest_events.OnPartyInclude, agent=self)
            # Ещё отправить это же owner'у party
            if party.owner is not self:
                party.owner.example.profile.on_event(event=e, cls=quest_events.OnPartyInclude, agent=self)

    def party_before_exclude(self, party, old_member, time):
        # todo: Если это событие, назвать соответственно с приставкой on ##refactor
        # todo: delivery for subscribers ##quest
        # todo: docstring
        # party - откуда исключабт, agent - кого исключают
        if not self.is_online:
            return
        car = self.car
        if car is not None:
            self._auto_fire_enable = car.is_auto_fire_enable()
            car.fire_auto_enable(enable=False, time=time)
        for obj in self.slave_objects:
            if isinstance(obj, Unit):
                obj.fire_auto_enable(enable=False, time=time)
        # todo: Пробросить событие в квест ##quest

    def party_after_exclude(self, party, old_member, time):
        # todo: Если это событие, назвать соответственно с приставкой on ##refactor
        # todo: delivery for subscribers ##quest
        # todo: docstring
        # party - откуда исключили, agent - кого исключили
        if not self.is_online:
            return
        car = self.car
        if car is not None:
            car.fire_auto_enable(time=time + 0.01, enable=self._auto_fire_enable)
        for obj in self.slave_objects:
            if isinstance(obj, Unit):
                obj.fire_auto_enable(enable=True, time=time + 0.01)
        # Пробросить событие в квест ##quest
        if old_member is self:  # Если исключили себя
            e = Event(server=self.server, time=time)
            self.example.profile.on_event(event=e, cls=quest_events.OnPartyExclude, agent=self)
            # Ещё отправить это же owner'у party
            if party.owner is not self:
                party.owner.example.profile.on_event(event=e, cls=quest_events.OnPartyExclude, agent=self)


    def _invite_by_id(self, invite_id):
        for invite in self.invites:
            if invite.id == invite_id:
                return invite
        if self.party:
            for invite in self.party.invites:
                if invite.id == invite_id:
                    return invite
        return None

    def delete_invite(self, invite_id, time):
        # получить инвайт с данным id
        invite = self._invite_by_id(invite_id)
        if (invite is not None) and (invite.can_delete_by_agent(self)):
            PartyInviteDeleteEvent(invite=invite, time=time).post()
        else:
            PartyErrorMessage(
                agent=self, time=time,
                comment="You not have access for this invite {}".format(invite_id),
            ).post()

    def clear_invites(self, time):
        for invite in self.invites:
            self.delete_invite(invite_id=invite.id, time=time)

    def is_target(self, target):
        if not isinstance(target, Unit):  # если у объекта есть ХП и по нему можно стрелять
            return False

        if isinstance(target, ExtraMobile):  # если этот объект является миной
            # Определение таргета в 3 этапа: спрашиваем у агента, спрашиваем у оружия, спрашиваем у самого таргета
            if not target.example.is_target():
                return False

        t_agent = target.main_agent

        if t_agent is self:
            return False

        if t_agent is None:
            return True

        # проверка объекта на партийность
        if t_agent.party and self.party:
            if t_agent.party is self.party:
                return False
        return True

    def get_all_visible_objects(self):
        obj_list = []
        for observer in self.observers:
            for v_o in observer.visible_objects:
                if v_o not in obj_list:
                    obj_list.append(v_o)
        return obj_list

    def check_visible(self, obj):
        for observer in self.observers:
            if obj in observer.visible_objects:
                return True
        return False

    def on_see(self, time, subj, obj):
        # todo: delivery for subscribers ##quest
        is_first = obj.subscribed_agents.inc(self) == 1
        if not is_first:
            return
        See(
            agent=self,
            time=time,
            subj=subj,
            obj=obj,
            is_first=is_first,
        ).post()

        obj.start_see_me(agent=self, time=time)  # Сообщить объекту, что его начали видеть

        if isinstance(obj, Unit):
            obj.send_auto_fire_messages(agent=self, action=True, time=time)
        # self.subscriptions.on_see(agent=self, time=time, subj=subj, obj=obj)
        self.example.profile.on_event(event=Event(server=self.server, time=time), cls=quest_events.OnQuestSee, obj=obj)

    def on_out(self, time, subj, obj):
        # todo: delivery for subscribers ##quest
        is_last = obj.subscribed_agents.dec(self) == 0
        if not is_last:
            return
        Out(
            agent=self,
            time=time,
            subj=subj,
            obj=obj,
            is_last=is_last,
        ).post()

        obj.finish_see_me(agent=self, time=time)  # Сообщить объекту, что его перестали видеть

        if isinstance(obj, Unit):
            obj.send_auto_fire_messages(agent=self, action=False, time=time)
        # self.subscriptions.on_out(agent=self, time=time, subj=subj, obj=obj)
        self.example.profile.on_event(event=Event(server=self.server, time=time), cls=quest_events.OnQuestOut, obj=obj)

    def start_see_me(self, agent, time):
        pass

    def finish_see_me(self, agent, time):
        pass

    @property
    def stealth_indicator(self):
        if not self.car or not self.car.is_alive:
            return 0
        count = len(self.watched_locations)  # Сразу учитываем все города, которые нас видят
        car = self.car
        for agent in car.subscribed_agents.keys():
            if agent is not self:  # info: пати можно будет учесть здесь
                count += 1
        return count

    def on_message(self, connection, message):
        # todo: delivery for subscribers ##quest
        pass

    def on_kill(self, event, target, killer):
        # log.debug('%s:: on_kill(%s)', self, target)
        self.log.info('{}:: on_kill {} killer={} time={}'.format(self, target, killer, event.time))
        # todo: registry fix?
        self.example.profile.set_frag(dvalue=1)  # начисляем фраг агенту

        if target.owner_example:
            self_lvl = self.example.profile.get_real_lvl()
            killed_lvl = target.owner_example.profile.get_real_lvl()
            m_lvl = 1.0 + (float(killed_lvl) - float(self_lvl)) / self.server.max_agent_lvl
        else:
            m_lvl = 1.0

        car_base_price = getattr(target.example, 'base_exp_price', 1.0)
        if self.car is killer:  # Если убийство сделано текущей машинкой агента
            self_car_exp = self.car.example.exp
            target_car_exp = target.example.exp
            m = self.car.example.exp_table.car_m_exp_by_exp(exp=self_car_exp)
            if isinstance(target.main_agent, User):
                target_car_exp_price = target.example.exp_table.car_exp_price_by_exp(exp=target_car_exp)
            else:
                target_car_exp_price = target.example.exp_table.car_exp_price_by_exp(exp=0)
            d_user_exp = round(target_car_exp_price * m * car_base_price * m_lvl)
            self.log.info('Self_car_killer::{killer} and target::{target}. self_car_exp={self_car_exp}, target_car_exp={target_car_exp}, car_base_price={car_base_price},  modifier={m}, target_car_exp_price={target_car_exp_price}, m_lvl={m_lvl}, d_user_exp={d_user_exp}'.format(
                killer=killer, target=target, self_car_exp=self_car_exp,
                target_car_exp=target_car_exp, m=m, target_car_exp_price=target_car_exp_price, car_base_price=car_base_price, m_lvl=m_lvl, d_user_exp=d_user_exp))

        else:
            d_user_exp = round(target.example.exp_table.car_exp_price_by_exp(exp=target.example.exp) * car_base_price)
            self.log.warning('Warning on_kill self.car::{} and target::{} and killer::{}   car_base_price={}'.format(self.car, target, killer, car_base_price))

        if self.party:
            self.party.on_exp(agent=self, dvalue=d_user_exp, event=event)
        else:
            self.example.profile.set_exp(dvalue=d_user_exp, time=event.time)   # начисляем опыт агенту

        if target.owner_example:
            # info: Провели рассчёт выше
            # self_lvl = self.example.profile.get_real_lvl()
            # killed_lvl = target.owner_example.profile.get_real_lvl()

            # todo: определиться куда вынести все эти магические числа (разница в лвл, граница определения антогонистов,
            # изменение кармы)
            if ((self_lvl - killed_lvl) >= 3) and (target.owner_example.profile.karma_norm >= -0.1):
                self.example.profile.set_karma(dvalue=-1, time=event.time)  # todo: пробрасываать event? Переименовать в change_karma?

        self.example.profile.on_event(event=event, cls=quest_events.OnKill, agent=target.owner_example, unit=target.example)

    def on_change_inventory_cb(self, inventory, time):
        # todo: Разобраться с именем этого метода
        self.on_change_inventory(inventory=inventory, time=time)

    @event_deco
    def on_change_inventory(self, event, inventory):
        # todo: Разобраться с именем этого метода
        time = event.time
        if inventory is self.inventory:  # todo: возможно стереть!
            total_old = self.inventory.example.total_item_type_info()
            self.inventory.save_to_example(time=time)
            if self.current_location:
                trader = self.current_location.example.get_npc_by_type(Trader)
                if trader:
                    TraderAgentAssortmentMessage(npc_node_hash=trader.node_hash(), agent=self, time=time).post()
            self.on_inv_change(event=event, diff_inventories=self.inventory.example.diff_total_inventories(total_info=total_old))

    def on_inv_change(self, event, diff_inventories, make_game_log=True):
        # diff_inventories - dict с полями-списками incomings и outgoings, в которых хранятся
        # пары node_hash и кол-во
        if make_game_log and diff_inventories and (diff_inventories['incomings'] or diff_inventories['outgoings']):
            InventoryChangeLogMessage(agent=self, time=event.time, **diff_inventories).post()
            if diff_inventories.get('incomings', None):
                self.adm_log(type='inventory', text="inc: {}".format(diff_inventories['incomings']))
            if diff_inventories.get('outgoings', None):
                self.adm_log(type='inventory', text="out: {}".format(diff_inventories['outgoings']))

        self.example.profile.on_event(event=event, cls=quest_events.OnChangeInventory, diff_inventories=diff_inventories)
        # self.subscriptions.on_inv_change(agent=self, time=time, **diff_inventories)
        pass

    def has_active_barter(self):
        for barter in self.barters:
            if barter.is_active():
                return True
        return False

    def reload_inventory(self, time, save=True, total_inventory=None, make_game_log=True):
        if self.inventory:
            if save:
                self.inventory.save_to_example(time=time)
            self.inventory.del_all_visitors(time=time)
            self.inventory = None
        if self.example.profile.car:
            LoadInventoryEvent(agent=self, inventory=self.example.profile.car.inventory, total_inventory=total_inventory,
                               time=time, make_game_log=make_game_log).post()

    def on_enter_location(self, location, event):
        # Отключить все бартеры (делать нужно до раздеплоя машины)
        # todo: разобраться с time-0.1
        for barter in self.barters:
            barter.cancel(time=event.time-0.01)

        self.example.profile.in_location_flag = True
        self.example.profile.last_town = location.example

        # Раздеплоить машинку агента
        if self.car:  # Вход в город и раздеплой машинки
            self.car.example.last_location = location.example
            self.car.displace(time=event.time)
            LoadInventoryEvent(agent=self, inventory=self.example.profile.car.inventory, time=event.time + 0.01, make_game_log=False).post()
        elif self.example.profile.car and self.inventory:  # Обновление клиента (re-enter)
            self.inventory.send_inventory(agent=self, time=event.time)
        elif self.example.profile.car and self.inventory is None:  # Загрузка агента с машинкой сразу в город
            LoadInventoryEvent(agent=self, inventory=self.example.profile.car.inventory, time=event.time + 0.01, make_game_log=False).post()

        # self.subscriptions.on_enter_location(agent=self, event=event, location=location)

        # Сообщаем всем квестам что мы вошли в город
        self.example.profile.on_event(event=event, cls=quest_events.OnEnterToLocation, location=location)

        # todo: review quest_inventory
        self.example.profile.quest_inventory.refresh(agent=self.example, event=event)

    def on_exit_location(self, location, event):
        # log.debug('%s:: on_exit_location(%s)', self, location)
        self.example.profile.in_location_flag = False

        if self.inventory:
            self.inventory.save_to_example(time=event.time)
            self.inventory.del_all_visitors(time=event.time)
            self.inventory = None

        self.reload_parking_bag(new_example_inventory=None, time=event.time)  # todo: Проброс события
        # self.subscriptions.on_exit_location(agent=self, event=event, location=location)
        # self.example.profile.on_event(event=event, cls=quest_events.OnDie)  # todo: ##quest send unit as param

        # todo: review quest_inventory
        self.example.profile.quest_inventory.refresh(agent=self.example, event=event)

        # Сообщаем всем квестам что мы вышли из города
        self.example.profile.on_event(event=event, cls=quest_events.OnExitFromLocation, location=location)

    def on_enter_npc(self, event):
        # log.debug('{self}:: on_enter_npc({event.npc})'.format(**locals()))
        self.example.profile.on_event(event=event, cls=quest_events.OnEnterNPC, npc=event.npc)  # todo: ##quest send NPC as param

    def on_exit_npc(self, event, npc):
        # todo: ##quest call it
        log.debug('%s:: on_exit_npc(%s)', self, npc)
        self.example.profile.on_event(event=event, cls=quest_events.OnExitNPC, npc=npc)  # todo: ##quest send NPC as param

    def on_die(self, event, unit):
        # log.debug('%s:: on_die()', self)
        self.log.info('on_die unit={}'.format(unit))
        self.example.profile.position = unit.position(event.time)  # Запоминаем последние координаты агента

        # Перестать всем городам злиться на уже убитого агента:
        for town in Town.get_towns():
            town.need_stop_attack(obj=unit, agent=self)
        # Проброс эвента в страховку: там будет предопределён last_town
        self.example.profile.insurance.on_die(agent=self.example, time=event.time)

        # Отключить все бартеры (делать нужно до раздеплоя машины)
        # todo: разобраться с time-0.1
        for barter in self.barters:
            barter.cancel(time=event.time-0.01)

        self.send_die_message(event, unit)
        self.example.profile.on_event(event=event, cls=quest_events.OnDie)  # todo: ##quest send unit as param

    def send_die_message(self, event, unit):
        Die(agent=self, time=event.time).post()

    def on_trade_enter(self, contragent, time, is_init):
        log.debug('%s:: on_trade_enter(%s)', self, contragent)
        # self.subscriptions.on_trade_enter(agent=self, contragent=contragent, time=time, is_init=is_init)

    def on_trade_exit(self, contragent, canceled, buy, sale, cost, time, is_init):
        # todo: csll it ##quest
        log.debug('%s:: on_trade_exit(contragent=%r, cancelled=%r, buy=%r, sale=%r, cost=%r)',
                  self, contragent, canceled, buy, sale, cost)
        # self.subscriptions.on_trade_exit(
        #     agent=self, contragent=contragent,
        #     canceled=canceled, buy=buy, sale=sale, cost=cost,
        #     time=time, is_init=is_init)

    def reload_parking_bag(self, new_example_inventory, time):
        # Сохранение старого
        if self.parking_bag:
            self.parking_bag.displace(time)
            self.parking_bag = None
        # Создание нового
        if new_example_inventory:
            self.parking_bag = ParkingBag(agent=self, example_inventory=new_example_inventory, time=time)

    def print_login(self):
        return self._login

    def set_teaching_state(self, state):
        user = self.user
        user.teaching_state = state
        user.save()
        self.log.info('teaching state for user <{!r}> changed: {!r}'.format(self._login, state))

    @staticmethod
    def check_users_in_target_cars(targets):
        for t in targets:
            if isinstance(t.main_agent, User):
                return True
        return False

    def on_discharge_shoot(self, obj, targets, is_damage_shoot, time):
        # log.info('on_discharge_shoot for {}'.format(targets))
        # Если был дамаг, то сообщить об этом в квесты
        if is_damage_shoot:  # todo: пробросить сюда Ивент
            self.example.profile.on_event(event=Event(server=self.server, time=time), cls=OnMakeDmg,
                                          targets=targets, damager=obj)

        # info: 20-10-17 Ракеты города наказывают только за атаку по живым игрокам
        if is_damage_shoot and targets and self.check_users_in_target_cars(targets):
            for poi in self.watched_locations:
                poi.on_enemy_candidate(agent=self, time=time, damage=is_damage_shoot)

    def on_autofire_start(self, obj, target, time):
        # log.info('on_autofire_start for {}'.format(target))
        # info: 20-10-17 Ракеты города наказывают только за атаку по живым игрокам
        if self.check_users_in_target_cars([target]):
            for poi in self.watched_locations:
                poi.on_enemy_candidate(agent=self, time=time, damage=True)

        # todo: пробросить сюда Ивент
        self.example.profile.on_event(event=Event(server=self.server, time=time), cls=OnMakeDmg,
                                      targets=[target], damager=obj)

    def on_setup_map_weapon(self, obj, time):
        # log.info('on_setup_map_weapon for {}'.format(obj))
        # info: 20-10-17 Ракеты города наказывают только за атаку по живым игрокам
        pass
        # if not obj.example.is_target():
        #     return
        # for poi in self.watched_locations:
        #     poi.on_enemy_candidate(agent=self, time=time, damage=False)

    def on_bang_damage(self, obj, targets, time):
        # log.info('on_extramobile_damage for {}'.format(obj))
        len_targets = len(targets)
        damage = len_targets > 1 or len_targets == 1 and self.car not in targets  # Дамаг по себе не считается дамагом для города
        # info: 20-10-17 Ракеты города наказывают только за атаку по живым игрокам
        if targets and self.check_users_in_target_cars(targets):
            for poi in self.watched_locations:
                poi.on_enemy_candidate(agent=self, time=time, damage=damage)

        # Если был дамаг, то сообщить об этом в квесты
        if damage:  # todo: пробросить сюда Ивент
            self.example.profile.on_event(event=Event(server=self.server, time=time), cls=OnMakeDmg,
                                          targets=targets, damager=obj)

    def on_activated_item(self, item, inventory, event):
        # log.info('{} on_activated_item {} from {}'.format(self, item, inventory))
        self.example.profile.on_event(event=event, cls=OnActivateItem, item_example=item.example)

    def on_get_damage(self, event, damager, damage_type=None):
        # log.debug('{} on_get_damage from {} with damage_type: {}'.format(self, damager.main_agent, damage_type))
        self.example.profile.on_event(event=event, cls=OnGetDmg, obj=damager)

    def get_loading_coord(self, time):
        # Возвращает координаты для загрузки карты клиентом (вызывается в pages.py)
        if self.car:
            return self.car.position(time=time)
        elif self.current_location is not None and self.example.profile.in_location_flag:
            return self.current_location.example.position
        elif self.example.profile.car:
           return self.example.profile.car.position
        elif self.example.profile.last_town:
            return self.example.profile.last_town.position
        self.log.warning('Agent position dont definded')
        return None

    def on_rpg_state_transaction(self, event):
        self.example.profile.on_event(event=event, cls=quest_events.OnRPGSetTransaction)

        # Отправить обновлённые цены на ассортимент торговца и на свой инвентарь
        if self.current_location:
            trader = self.current_location.example.get_npc_by_type(Trader)
            if trader:
                h = trader.node_hash()
                TraderAgentAssortmentMessage(npc_node_hash=h, agent=self, time=event.time).post()
                TraderInfoMessage(agent=self, time=event.time, npc_node_hash=h).post()

        if self.party and self.party.owner is self:
            self.party.change_exp_modifier()

    def global_position(self, time):
        if self.car and not self.car.limbo:
            return self.car.position(time)
        if self.current_location:
            return self.current_location.position(time)
        return self.example.profile.last_town.position.as_point()

    def on_change_car_lvl(self, time):
        CarRPGInfo(agent=self, time=time).post()

    def get_lang(self):
        return self.user and self.user.lang or 'en'

    @property
    def access_level(self):
        return self.user and self.user.access_level or 0


# todo: Переименовать в UserAgent
class User(Agent):
    @event_deco
    def create_teaching_quest(self, event):
        quest_parent = self.server.reg.get('/registry/quests/teaching')
        if quest_parent.can_instantiate(event=event, agent=self.example, hirer=None):
            new_quest = quest_parent.instantiate(abstract=False, hirer=None)
            if new_quest.generate(event=event, agent=self.example):
                self.example.profile.add_quest(quest=new_quest, time=event.time)
                self.example.profile.start_quest(new_quest.uid, time=event.time, server=self.server)
            else:
                log.debug('Quest<{}> dont generate for <{}>! Error!'.format(new_quest, self))
                del new_quest

    def as_dict(self, **kw):
        d = super(User, self).as_dict(**kw)
        d['user_name'] = self._login
        d['avatar_link'] = self.avatar_link
        return d

    def setup_logger(self, level=logging.DEBUG):
        return super(User, self).setup_logger(level=level)

    def after_delete(self, time):
        handlers = self._logger.handlers[:]
        for h in handlers:
            self._logger.removeHandler(h)

    def start_see_me(self, agent, time):
        super(User, self).start_see_me(agent=agent, time=time)
        # Пересчитать сколько меня видят и отправить информацию на клиент
        if self.car and self.car.is_alive:
            ChangeStealthIndicator(agent=self, time=time, stealth=self.stealth_indicator).post()

    def finish_see_me(self, agent, time):
        super(User, self).finish_see_me(agent=agent, time=time)
        # Пересчитать сколько меня видят и отправить информацию на клиент
        if self.car and self.car.is_alive:
            ChangeStealthIndicator(agent=self, time=time, stealth=self.stealth_indicator).post()


class AI(Agent):
    u""" Класс-родитель для всех агентов-ботов """
    # def setup_logger(self, level=logging.INFO):
    #     logger_name = 'agent_{}'.format(self._login)
    #     log_file = 'log/agents/bot_{}.log'.format(logger_name)
    #     l = logging.getLogger(logger_name)
    #     l.propagate = 0
    #     formatter = logging.Formatter('%(asctime)s : %(message)s')
    #     fileHandler = logging.handlers.TimedRotatingFileHandler(filename=log_file, when='midnight', backupCount=5)
    #     fileHandler.setFormatter(formatter)
    #     l.setLevel(level)
    #     l.addHandler(fileHandler)
    #     return l

    def on_save(self, time):
        pass


class QuickUser(User):
    quick_game_koeff_kills = 30
    quick_game_koeff_bot_kills = 10
    quick_game_koeff_time = 0.1

    def __init__(self, **kw):
        super(QuickUser, self).__init__(**kw)
        self.time_quick_game_start = None
        self.quick_game_kills = 0
        self.quick_game_bot_kills = 0
        self.record_id = None
        self.bonus_points = 0  #

        self.time_of_end_kills_series = None
        self.series_kills = 0

        self._next_respawn_point = None

    def _add_quick_game_record(self, points, time):
        # pymongo add to quick_game_records
        self.record_id = self.server.app.db.quick_game_records.insert(
            {
                'name': self.print_login(),
                'user_uid': self.user.id,
                'points': points,
                'time': self.server.get_time()
            }
        )

    def on_connect(self, **kw):
        super(QuickUser, self).on_connect(**kw)
        if self.car:
            QuickGameChangePoints(agent=self, time=self.server.get_time()).post()

    def append_car(self, time, **kw):
        super(QuickUser, self).append_car(time=time, **kw)
        # Сбросить время старта и количество фрагов
        self.time_quick_game_start = self.server.get_time()
        self.quick_game_kills = 0
        self.quick_game_bot_kills = 0
        self.bonus_points = 0
        QuickGameChangePoints(agent=self, time=time).post()

    def drop_car(self, car, time, **kw):
        # if car is self.car:
        #     self._add_quick_game_record(time=time)
        super(QuickUser, self).drop_car(car=car, time=time, **kw)
        # В быстрой игре нужно уничтожить все slave-объекты
        # for obj in self.slave_objects:
        #     obj.delete(time)

    def get_quick_game_points(self, time):
        return round(round((time - self.time_quick_game_start) * self.quick_game_koeff_time) +
                     self.quick_game_kills * self.quick_game_koeff_kills +
                     self.quick_game_bot_kills * self.quick_game_koeff_bot_kills) + self.bonus_points

    def send_die_message(self, event, unit):
        points = self.get_quick_game_points(event.time)
        self._add_quick_game_record(points=points, time=event.time)
        QuickGameDie(agent=self, obj=unit, points=points, time=event.time).post()

    def on_kill(self, event, target, killer):
        self.log.info('{}:: on_kill {} and killer={}'.format(self, target, killer))

        if self.car is None:
            return
        if killer is not self.car and getattr(killer, "starter", None) and killer.starter is not self.car:
            return

        if target.owner and isinstance(target.owner, AI):
            self.quick_game_bot_kills += 1
        else:
            self.quick_game_kills += 1
        # добавить хп и бензина своей машинке
        if self.car:
            self.car.set_hp(time=event.time, dhp=-round(self.car.max_hp / 5))  # 20 % от максимального HP своей машинки
            self.car.set_fuel(time=event.time, df=round(self.car.fuel_state.max_fuel / 4))  # 25 % от максимального HP своей машинки
        # Отправка сообщения об убийстве кого-то
        if target.main_agent:
            QuickGameArcadeTextMessage(agent=self, time=event.time,
                                       text=u"{!r} {}".format(target.main_agent.print_login(), locale(lang=self.get_lang(), key="ta_kill_player"))).post()
        # Обработка серии убийств
        if self.time_of_end_kills_series and self.time_of_end_kills_series > event.time:  # Если серия убийств в процессе
            self.time_of_end_kills_series = event.time + 7.0
            self.series_kills += 1
            if self.series_kills == 2:
                QuickGameArcadeTextMessage(agent=self, time=event.time, text=locale(lang=self.get_lang(), key="ta_double_kill")).post()
            elif self.series_kills == 3:
                QuickGameArcadeTextMessage(agent=self, time=event.time, text=locale(lang=self.get_lang(), key="ta_tripple_kill")).post()
            else:
                QuickGameArcadeTextMessage(agent=self, time=event.time,
                                           text=u"{}: {!s}".format(locale(lang=self.get_lang(), key="ta_series_of_kill"), self.series_kills)).post()
            if self.series_kills > 1:
                self.bonus_points += (self.series_kills - 1) * 5
        else:  # Если серия не начиналась или закончилась
            self.time_of_end_kills_series = event.time + 7.0  # Даём 7 секунд на одно убийство
            self.series_kills = 1

        QuickGameChangePoints(agent=self, time=event.time).post()

    def init_example_car(self):
        user = self.user
        # log.info('QuickGameUser Try get new car: %s  [car_index=%s]', self._login, user.car_index)
        self.log.info('QuickGameUser Try get new car: {!r}  [car_index={}]'.format(self._login, user.car_index))
        # Создание "быстрой" машинки
        try:
            user.car_index = int(user.car_index)
        except:
            log.warning('Wrong QuickGame car index format %r', user.car_index)
            user.car_index = 0

        _count_qg_cars = len(self.server.quick_game_cars_proto)
        if not (0 <= user.car_index < _count_qg_cars):
            log.warning('Wrong QuickGame car index %r: not in interval [0..%r)', user.car_index, _count_qg_cars)
            user.car_index = 0

        self.example.profile.car = self.server.quick_game_cars_proto[user.car_index].instantiate()

        if user.start_position:
            self.example.profile.car.position = user.start_position
            user.start_position = None
        else:
            # Радиус появления игроков в быстрой игре
            self.example.profile.car.position = self._next_respawn_point or Point.random_point(self.server.quick_game_respawn_bots_radius, self.server.quick_game_start_pos)

        self.example.profile.current_location = None
        self.current_location = None

    def on_die(self, event, **kw):
        super(QuickUser, self).on_die(event=event, **kw)
        self._next_respawn_point = Point.random_point(self.server.quick_game_respawn_bots_radius, self.server.quick_game_start_pos)
        SetMapCenterMessage(agent=self, time=event.time, center=self._next_respawn_point).post()  # send message to load map

    def print_login(self):
        if self.user.quick:
            str_list = self._login.split('_')
            if len(str_list) > 1:
                return '_'.join(str_list[:-1])
            else:
                return self._login
        else:
            return super(QuickUser, self).print_login()


class TeachingUser(QuickUser):
    def __init__(self, time, **kw):
        super(TeachingUser, self).__init__(time=time, **kw)
        self.armory_shield_status = False
        self.quest_parent = None
        if not self.user.quick:
            assert self.user.teaching_state == 'map' or self.user.teaching_state == 'map_start'
            self.quest_parent = self.server.reg.get('/registry/quests/teaching_map')
            self.create_teaching_quest_map(time=time)

        # Тест Авто Стрельбы
        # AgentTestEvent(agent=self, time=time + 1.0).post()

    def on_connect(self, **kw):
        super(TeachingUser, self).on_connect(**kw)
        if self.user.teaching_state == '' and not self.has_active_teaching_quest():
            StartQuickGame(agent=self, time=self.server.get_time()).post()

    def has_active_teaching_quest(self):
        quest_parent = self.quest_parent or self.server.reg.get('/registry/quests/teaching_map')
        if quest_parent is None:
            return False
        for q in self.example.profile.quests_active:
            if q.parent == quest_parent and q.status == 'active':
                return True
        return False

    @event_deco
    def create_teaching_quest_map(self, event):
        quest_parent = self.quest_parent or self.server.reg.get('/registry/quests/teaching_map')
        if quest_parent is None:
            return
        if quest_parent.can_instantiate(event=event, agent=self.example, hirer=None):
            new_quest = quest_parent.instantiate(abstract=False, hirer=None)
            if new_quest.generate(event=event, agent=self.example):
                self.example.profile.add_quest(quest=new_quest, time=event.time)
                self.example.profile.start_quest(new_quest.uid, time=event.time, server=self.server)
                self.quest_parent = quest_parent
                if self.user.quick:
                    self.set_teaching_state('map')
            else:
                log.debug('Quest<{}> dont generate for <{}>! Error!'.format(new_quest, self))
                del new_quest

    @event_deco
    def init_example_car_teaching(self, event):
        if self.car:
            return
        if self.api:
            self.api.quick_play_again()
        else:
            log.warning('Try to use API method without API')

    def send_die_message(self, event, unit):
        if not self.has_active_teaching_quest():
            super(TeachingUser, self).send_die_message(event, unit)

    def on_die(self, event, **kw):
        super(TeachingUser, self).on_die(event=event, **kw)
        self.armory_shield_status = False

    def append_car(self, time, **kw):
        if self.has_active_teaching_quest():
            # todo: пробпросить Event сюда
            self.armory_shield_on(Event(server=self.server, time=time))

        super(TeachingUser, self).append_car(time=time, **kw)

        # if self.user.teaching_state == '':  # Если юзер ещё не ответил на вопрос про обучение
        #     self.armory_shield_on(Event(server=self.server, time=time))

    def armory_shield_on(self, event):
        if self.car and not self.armory_shield_status:
            self.car.params.get('p_armor').current += 100
            self.car.restart_weapons(time=event.time)
            self.armory_shield_status = True
            self.car.on_update(event)

    def armory_shield_off(self, event):
        if self.car and self.armory_shield_status:
            self.car.params.get('p_armor').current -= 100
            self.car.restart_weapons(time=event.time)
            self.armory_shield_status = False
            self.car.on_update(event)
