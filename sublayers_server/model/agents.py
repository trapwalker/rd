# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import messages
from sublayers_server.model.base import Object
from sublayers_server.model.party import PartyInviteDeleteEvent
from sublayers_server.model.units import Unit
from counterset import CounterSet
from map_location import MapLocation
from sublayers_server.model.registry.uri import URI
from sublayers_server.model.registry.tree import Node
from sublayers_server.model.utils import SubscriptionList
from sublayers_server.model.messages import QuestUpdateMessage
from sublayers_server.model.events import event_deco
from sublayers_server.model.agent_api import AgentAPI


# todo: make agent offline status possible
class Agent(Object):
    __str_template__ = '<{self.dead_mark}{self.classname} #{self.id} AKA {self.login!r}>'

    def __init__(self, login, time, example, party=None, **kw):
        """
        @type example: sublayers_server.model.registry.classes.agents.Agent
        """
        super(Agent, self).__init__(time=time, **kw)
        self._disconnect_timeout_event = None
        self.subscriptions = SubscriptionList()
        self.example = example
        self.observers = CounterSet()
        self.api = None
        self.connection = None
        self.login = login
        # todo: normalize and check login
        self.server.agents[login] = self
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

        self.quests = {}  # Все квесты, касающиеся агента. Ключ - Quest.key, значение - сам квест

    def add_quest(self, quest, time):
        self.quests[quest.key] = quest
        QuestUpdateMessage(agent=self, time=time, quest=quest).post()

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

    def update_quest_list(self, npc):
        for quest in npc.quests or []:
            # todo: Проверка на доступность этого квеста данному агенту
            # todo: Проверка на наличие этого квеста у агента
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

    def get_barter_by_id(self, barter_id):
        # todo: refactoring (!!!)
        for barter in self.barters:
            if barter.id == barter_id:
                return barter
        return None

    def save(self, time):
        self.example.login = self.login
        if self.car:
            self.car.save(time)
            self.example.car = self.car.example
        elif self.current_location is None:
            self.example.car = None
        # todo: save chats, party...
        self.example.save()
        log.debug('Agent %s saved', self)

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

    def drop_observer(self, observer, time):
        if not self.is_online:
            return
        # remove _self_ from all _visible objects_ by _observer_
        for vo in observer.visible_objects:
            self.on_out(time=time, subj=observer, obj=vo)
        self.on_out(time=time, subj=observer, obj=observer)
        observer.watched_agents[self] -= 1
        self.observers[observer] -= 1

    def as_dict(self, **kw):
        d = super(Agent, self).as_dict(**kw)
        d.update(
            login=self.login,
            party=self.party.as_dict() if self.party else None,
            balance=self.example.balance,
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

        if self.api:
            connection.api = self.api
            self.api.update_agent_api()
        else:
            self.api = AgentAPI(agent=self)

        # обновление статистики по онлайну агентов
        self.server.stat_log.s_agents_on(time=self.server.get_time(), delta=1.0)

    def on_disconnect(self, connection):
        log.info('Agent %s disconnected', self)  # todo: log disconnected ip and duration
        # todo: Измерять длительность подключения ##defend ##realize
        t = self.server.get_time()
        DISCONNECT_TIMEOUT = 10  # todo: move to server settings ##refactor
        log.debug('!!! set timeout from %s to %s', t, t + DISCONNECT_TIMEOUT)
        self._disconnect_timeout_event = self.on_disconnect_timeout(time=t + DISCONNECT_TIMEOUT)
        log.debug('!!! set timeout res: %r', self._disconnect_timeout_event)

    @event_deco
    def on_disconnect_timeout(self, event):
        log.info('Agent %s disconnect timeout event', self, event)
        self._disconnect_timeout_event = None
        self.server.stat_log.s_agents_on(time=event.time, delta=-1.0)
        self.save(time=event.time)
        self.subscriptions.on_disconnect(agent=self, time=event.time)
        log.info('Agent %s disconnect timeout', self)

    def party_before_include(self, party, new_member, time):
        # todo: Если это событие, назвать соответственно с приставкой on
        # todo: docstring
        # party - куда включают, agent - кого включают
        if not self.is_online:
            return
        car = self.car
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
        self.car.fire_auto_enable(time=time + 0.01, enable=self._auto_fire_enable)
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
        self.car.fire_auto_enable(time=time + 0.01, enable=self._auto_fire_enable)
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
            messages.PartyErrorMessage(agent=self, time=time,
                                       comment="You not have access for this invite {}".format(invite_id)).post()

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

    def on_see(self, time, subj, obj):
        # todo: delivery for subscribers ##quest
        # log.info('on_see %s viditsya  %s      raz:  %s', obj.owner.login, self.login, obj.subscribed_agents[self])
        is_first = obj.subscribed_agents.inc(self) == 1
        if not is_first:
            return
        messages.See(
            agent=self,
            time=time,
            subj=subj,
            obj=obj,
            is_first=is_first,
        ).post()
        if isinstance(obj, Unit):
            obj.send_auto_fire_messages(agent=self, action=True, time=time)
        self.subscriptions.on_see(agent=self, time=time, subj=subj, obj=obj)

    def on_out(self, time, subj, obj):
        # todo: delivery for subscribers ##quest
        # log.info('on_out %s viditsya  %s      raz:  %s', obj.owner.login, self.login, obj.subscribed_agents[self])
        is_last = obj.subscribed_agents.dec(self) == 0
        if not is_last:
            return
        messages.Out(
            agent=self,
            time=time,
            subj=subj,
            obj=obj,
            is_last=is_last,
        ).post()
        if isinstance(obj, Unit):
            obj.send_auto_fire_messages(agent=self, action=False, time=time)
        self.subscriptions.on_out(agent=self, time=time, subj=subj, obj=obj)

    def on_message(self, connection, message):
        # todo: delivery for subscribers ##quest
        pass

    def on_kill(self, time, obj):
        log.debug('%s:: on_kill(%s)', self, obj)
        # todo: party

        self.stat_log.frag(time=time, delta=1.0)  # начисляем фраг агенту
        # self.stat_log.exp(time=time, delta=obj.example.exp_price)   # начисляем опыт агенту
        self.stat_log.exp(time=time, delta=150)   # начисляем опыт агенту
        self.car.example.exp_price += 1  # увеличиваем "опытную" стоимость своего автомобиля

        # Отправить сообщение на клиент о начисленной экспе
        messages.AddExperienceMessage(agent=self, time=time,).post()
        self.subscriptions.on_kill(agent=self, time=time, obj=obj)

    def on_inv_change(self, time, incomings, outgoings):
        # todo: csll it ##quest
        self.subscriptions.on_inv_change(agent=self, time=time, incomings=incomings, outgoings=outgoings)

    def on_enter_location(self, time, location):
        log.debug('%s:: on_enter_location(%s)', self, location)
        self.subscriptions.on_enter_location(agent=self, time=time, location=location)

    def on_exit_location(self, time, location):
        log.debug('%s:: on_exit_location(%s)', self, location)
        self.subscriptions.on_exit_location(agent=self, time=time, location=location)

    def on_enter_npc(self, npc):
        # todo: csll it ##quest
        # todo: delivery for subscribers ##quest
        log.debug('%s:: on_enter_npc(%s)', self, npc)

    def on_exit_npc(self, npc):
        # todo: csll it ##quest
        # todo: delivery for subscribers ##quest
        log.debug('%s:: on_exit_npc(%s)', self, npc)

    def on_die(self):
        # todo: csll it ##quest
        # todo: delivery for subscribers ##quest
        log.debug('%s:: on_die()', self)

    def on_trade_enter(self, contragent, time, is_init):
        log.debug('%s:: on_trade_enter(%s)', self, contragent)
        self.subscriptions.on_trade_enter(agent=self, contragent=contragent, time=time, is_init=is_init)

    def on_trade_exit(self, contragent, canceled, buy, sale, cost, time, is_init):
        # todo: csll it ##quest
        log.debug('%s:: on_trade_exit(contragent=%r, cancelled=%r, buy=%r, sale=%r, cost=%r)',
                  self, contragent, canceled, buy, sale, cost)
        self.subscriptions.on_trade_exit(
            agent=self, contragent=contragent, 
            canceled=canceled, buy=buy, sale=sale, cost=cost,
            time=time, is_init=is_init)


class User(Agent):
    # todo: realize
    pass


class AI(Agent):
    # todo: realize in future
    pass
