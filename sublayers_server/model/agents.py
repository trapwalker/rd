# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Object
from sublayers_server.model.party import PartyInviteDeleteEvent
from sublayers_server.model.units import Unit
from counterset import CounterSet
from map_location import MapLocation
from sublayers_server.model.registry.uri import URI
from sublayers_server.model.registry.tree import Node
from sublayers_server.model.registry.classes.inventory import LoadInventoryEvent
from sublayers_server.model.registry.classes.trader import Trader

# from sublayers_server.model.utils import SubscriptionList
from sublayers_server.model.messages import (
    PartyErrorMessage, UserExampleSelfRPGMessage, See, Out,
    SetObserverForClient, Die, QuickGameDie, TraderInfoMessage,
)
from sublayers_server.model.vectors import Point
from sublayers_server.model import quest_events
from sublayers_server.model.events import event_deco
from sublayers_server.model.parking_bag import ParkingBag
from sublayers_server.model.agent_api import AgentAPI

from tornado.options import options

import tornado.web


# todo: make agent offline status possible
class Agent(Object):
    __str_template__ = '<{self.dead_mark}{self.classname} #{self.id} AKA {self.user.name!r}>'

    # todo: Перенести аргумент user  в конструктор UserAgent
    # todo: Делать сохранение неюзер-агентов в особую коллекцию без идентификации по профилю
    def __init__(self, user, time, example, party=None, **kw):
        """
        @type example: sublayers_server.model.registry.classes.agents.Agent
        """
        super(Agent, self).__init__(time=time, **kw)
        self.example = example
        if example:
            example._agent_model = self
        self._disconnect_timeout_event = None
        # self.subscriptions = SubscriptionList()
        self.observers = CounterSet()
        self.api = None
        self.connection = None
        self.user = user
        self.server.agents[str(user._id)] = self  #todo: Перенести помещение в коллекцию в конец инициализации
        self.server.agents_by_name[user.name] = self
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
        self.current_location = example.current_location

        self.inventory = None  # Тут будет лежать инвентарь машинки когда агент в городе
        self.parking_bag = None  # Инвентарь выбранной машинки в паркинге (Специальный объект, у которого есть inventory)

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

    def log(self, time, text, dest, position=None):
        # todo: ##realize ##quest
        pass

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
        self.example.current_location = example_location

    @property
    def balance(self):
        return self.example.balance

    def on_save(self, time):
        self.example.login = self.user.name  # todo: Не следует ли переименовать поле example.login?
        if self.car:
            # todo: review (логичнее бы тут поставить self.car.save(time), но тогда возможно теряется смысл следующей строки)
            self.car.on_save(time)
            self.example.car = self.car.example
        # elif self.current_location is None:  # todo: wtf ?!
        #     self.example.car = None
        # todo: save chats, party...
        # self.example.save()
        agent = self
        def save_end(*av, **kw):
            log.debug('Agent %s saved', agent)
        self.example.save(upsert=True, callback=save_end)

    @property
    def is_online(self):
        return self.connection is not None

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
            login=self.user.name,  # todo: Переименовать login
            party=self.party.as_dict() if self.party else None,
            balance=self.balance,
        )
        return d

    def append_obj(self, obj, time):
        if obj not in self.slave_objects:
            self.slave_objects.append(obj)
            self.add_observer(observer=obj, time=time)
            if self.party:
                self.party.add_observer_to_party(observer=obj, time=time)

    def drop_obj(self, obj, time):
        if obj in self.slave_objects:
            if self.party:
                self.party.drop_observer_from_party(observer=obj, time=time)
            self.drop_observer(observer=obj, time=time)
            self.slave_objects.remove(obj)

    def append_car(self, car, time):  # specific
        if not self.car:
            self.car = car
            car.owner = self
            self.add_observer(observer=car, time=time)
            if self.party:
                # сообщить пати, что этот обсёрвер теперь добавлен на карту
                self.party.add_observer_to_party(observer=car, time=time)

    def drop_car(self, car, time, drop_owner=True):
        if car is self.car:
            if self.party:
                # сообщить пати, что этот обсёрвер теперь убран с карты
                self.party.drop_observer_from_party(observer=car, time=time)
            self.drop_observer(observer=car, time=time)
            if drop_owner:
                car.owner = None
            self.car = None

    def on_connect(self, connection):
        self.connection = connection
        if self._disconnect_timeout_event:
            self._disconnect_timeout_event.cancel()
            self._disconnect_timeout_event = None
            log.info('Connection of agent %s restored. Disconnect timeout cancelled.', self)
        else:
            log.info('Agent %s connected', self)

        if self.api:
            connection.api = self.api
            self.api.update_agent_api()
        else:
            self.api = AgentAPI(agent=self)

        # обновление статистики по онлайну агентов
        self.server.stat_log.s_agents_on(time=self.server.get_time(), delta=1.0)

    def on_disconnect(self, connection):
        timeout = options.disconnect_timeout
        log.info('Agent %s disconnected. Set timeout to %ss', self, timeout)  # todo: log disconnected ip
        # todo: Измерять длительность подключения ##defend ##realize
        t = self.server.get_time()
        self._disconnect_timeout_event = self.on_disconnect_timeout(time=t + timeout)

    @event_deco
    def on_disconnect_timeout(self, event):
        self._disconnect_timeout_event = None
        self.server.stat_log.s_agents_on(time=event.time, delta=-1.0)
        self.save(time=event.time)
        # self.subscriptions.on_disconnect(agent=self, time=event.time)
        if self.car:
            self.car.displace(time=event.time)
        log.info('Agent %s displaced by disconnect timeout', self)

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
        # todo: Пробросить событие в квест ##quest

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
        # todo: Пробросить событие в квест ##quest

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

    def is_target(self, target):
        if not isinstance(target, Unit):  # если у объекта есть ХП и по нему можно стрелять
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
        if isinstance(obj, Unit):
            obj.send_auto_fire_messages(agent=self, action=True, time=time)
        # self.subscriptions.on_see(agent=self, time=time, subj=subj, obj=obj)

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
        if isinstance(obj, Unit):
            obj.send_auto_fire_messages(agent=self, action=False, time=time)
        # self.subscriptions.on_out(agent=self, time=time, subj=subj, obj=obj)

    def on_message(self, connection, message):
        # todo: delivery for subscribers ##quest
        pass

    def on_kill(self, event, obj):
        log.debug('%s:: on_kill(%s)', self, obj)

        # todo: party
        # todo: registry fix?
        self.example.set_frag(dvalue=1)  # начисляем фраг агенту

        d_user_exp = obj.example.exp_table.car_exp_price_by_exp(exp=obj.example.exp * \
                     self.car.example.exp_table.car_m_exp_by_exp(exp=self.car.example.exp))
        self.example.set_exp(dvalue=d_user_exp)   # начисляем опыт агенту

        if obj.owner_example:
            self_lvl = self.example.get_lvl()
            killed_lvl = obj.owner_example.get_lvl()

            # todo: определиться куда вынести все эти магические числа (разница в лвл, граница определения антогонистов,
            # изменение кармы)
            if ((self_lvl - killed_lvl) >= 3) and (obj.owner_example.karma_norm >= -0.1):
                self.example.set_karma(dvalue=-1, time=event.time)  # todo: пробрасываать event? Переименовать в change_karma?

        # Отправить сообщение на клиент о начисленной экспе
        UserExampleSelfRPGMessage(agent=self, time=event.time).post()
        self.example.on_event(event=event, cls=quest_events.OnKill, agent=obj.owner_example, unit=obj.example)
        # self.subscriptions.on_kill(agent=self, event=event, obj=obj)

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
                    TraderInfoMessage(npc_node_hash=trader.node_hash(), agent=self, time=time).post()
            self.on_inv_change(time=time, diff_inventories=self.inventory.example.diff_total_inventories(total_info=total_old))

    def on_inv_change(self, time, diff_inventories):
        # diff_inventories - dict с полями-списками incomings и outgoings, в которых хранятся
        # пары node_hash и кол-во
        # todo: csll it ##quest
        # self.subscriptions.on_inv_change(agent=self, time=time, **diff_inventories)
        pass

    def has_active_barter(self):
        for barter in self.barters:
            if barter.is_active():
                return True
        return False

    def reload_inventory(self, time, save=True, total_inventory=None):
        if self.inventory:
            if save:
                self.inventory.save_to_example(time=time)
            self.inventory.del_all_visitors(time=time)
            self.inventory = None
        if self.example.car:
            LoadInventoryEvent(agent=self, inventory=self.example.car.inventory, total_inventory=total_inventory,
                               time=time).post()

    def on_enter_location(self, location, event):
        # Отключить все бартеры (делать нужно до раздеплоя машины)
        # todo: разобраться с time-0.1
        for barter in self.barters:
            barter.cancel(time=event.time-0.01)

        # Раздеплоить машинку агента
        if self.car:  # Вход в город и раздеплой машинки
            self.car.example.last_location = location.example
            self.car.displace(time=event.time)
            LoadInventoryEvent(agent=self, inventory=self.example.car.inventory, time=event.time + 0.01).post()
        elif self.example.car and self.inventory:  # Обновление клиента (re-enter)
            self.inventory.send_inventory(agent=self, time=event.time)
        elif self.example.car and self.inventory is None:  # Загрузка агента с машинкой сразу в город
            LoadInventoryEvent(agent=self, inventory=self.example.car.inventory, time=event.time + 0.01).post()

        # self.subscriptions.on_enter_location(agent=self, event=event, location=location)

    def on_exit_location(self, location, event):
        log.debug('%s:: on_exit_location(%s)', self, location)
        if self.inventory:
            self.inventory.save_to_example(time=event.time)
            self.inventory.del_all_visitors(time=event.time)
            self.inventory = None

        self.reload_parking_bag(new_example_inventory=None, time=event.time)  # todo: Проброс события
        # self.subscriptions.on_exit_location(agent=self, event=event, location=location)
        # self.example.on_event(event=event, cls=quest_events.OnDie)  # todo: ##quest send unit as param

    def on_enter_npc(self, event):
        log.debug('{self}:: on_enter_npc({event.npc})'.format(**locals()))
        self.example.on_event(event=event, cls=quest_events.OnEnterNPC, npc=event.npc)  # todo: ##quest send NPC as param

    def on_exit_npc(self, event, npc):
        # todo: ##quest call it
        log.debug('%s:: on_exit_npc(%s)', self, npc)
        self.example.on_event(event=event, cls=quest_events.OnExitNPC, npc=npc)  # todo: ##quest send NPC as param

    def on_die(self, event, unit):
        log.debug('%s:: on_die()', self)

        # Отключить все бартеры (делать нужно до раздеплоя машины)
        # todo: разобраться с time-0.1
        for barter in self.barters:
            barter.cancel(time=event.time-0.01)

        Die(agent=self, time=event.time).post()
        self.example.on_event(event=event, cls=quest_events.OnDie)  # todo: ##quest send unit as param

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


# todo: Переименовать в UserAgent
class User(Agent):
    def as_dict(self, **kw):
        d = super(User, self).as_dict(**kw)
        d['user_name'] = self.user.name
        d['avatar_link'] = self.user.avatar_link
        return d


class QuickUser(User):
    def __init__(self, **kw):
        super(QuickUser, self).__init__(**kw)
        self.time_quick_game_start = None
        self.quick_game_kills = 0

    def _add_quick_game_record(self, time):
        # pymongo add to quick_game_records
        self.server.app.db.quick_game_records.insert(
            {
                'name': '_'.join(self.user.name.split('_')[:-1]),
                'user_uid': self.user.id,
                'points': self.get_quick_game_points(time),
                'time': self.server.get_time()
            }
        )

    def append_car(self, time, **kw):
        super(QuickUser, self).append_car(time=time, **kw)
        # Сбросить время старта и количество фрагов
        self.time_quick_game_start = self.server.get_time()
        self.quick_game_kills = 0
        self.user.car_index = None

    def drop_car(self, car, time, **kw):
        if car is self.car:
            self._add_quick_game_record(time=time)
        super(QuickUser, self).drop_car(car=car, time=time, **kw)

    def get_quick_game_points(self, time):
        return round(time - self.time_quick_game_start) + self.quick_game_kills * 100

    def on_die(self, event, unit):
        QuickGameDie(agent=self, obj=unit, time=event.time).post()

    def on_kill(self, event, obj):
        log.debug('%s:: on_kill(%s)', self, obj)
        self.quick_game_kills += 1
        # добавить хп своей машинке
        if self.car:
            self.car.set_hp(time=event.time, dhp=-round(self.car.max_hp / 10))  # 10 % от максимального HP своей машинки

    @tornado.gen.coroutine
    def init_example_car(self):
        user = self.user
        log.info('QuickGameUser Try get new car: %s  [car_index=%s]', user.name, user.car_index)
        # Создание "быстрой" машинки
        try:
            user.car_index = int(user.car_index)
        except:
            user.car_index = 0

        if user.car_index < 0 or user.car_index >= len(self.server.quick_game_cars_proto):
            log.warning('Unknown QuickGame car index %s', user.car_index)
            user.car_index = 0
        else:
            user.car_index = int(user.car_index)
        self.example.car = self.server.quick_game_cars_proto[user.car_index].instantiate(fixtured=False)
        yield self.example.car.load_references()

        self.example.car.position = Point.random_gauss(self.server.quick_game_start_pos, 100)
        self.example.current_location = None
        self.current_location = None

# todo: Переиеновать в AIAgent
class AI(Agent):
    # todo: realize in future
    pass
