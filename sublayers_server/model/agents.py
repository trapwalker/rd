# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.base import Object
import messages
from sublayers_server.model.party import PartyInviteDeleteEvent
from sublayers_server.model.units import Unit
from counterset import CounterSet
from sublayers_server.model.stat_log import StatLogger
from bson import ObjectId


# todo: make agent offline status possible
class Agent(Object):
    __str_template__ = '<{self.dead_mark}{self.classname} #{self.id} AKA {self.login}>'

    def __init__(self, login, time, connection=None, party=None, **kw):
        super(Agent, self).__init__(time=time, **kw)
        self.observers = CounterSet()
        self.api = None
        # todo: replace Counter to CounterSet
        self.login = login
        self._connection = connection
        # todo: normalize and check login
        self.server.agents[login] = self
        self.cars = []  # specific
        self.slave_objects = []  # дроиды
        """@type: list[sublayers_server.model.units.Bot]"""
        self.party = None
        self.invites = []
        if party is not None:
            party.include(agent=self, time=time)

        self._auto_fire_enable = None  # нужна, чтобы сохранить состояние авто-стрельбы перед партийными изменениями
        self.stat_log = StatLogger(owner=self)

        # статистика сервера
        self.server.stat_log.s_agents_all(time=time, delta=1.0)

    @property
    def is_online(self):
        return self._connection is not None

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

    def on_see(self, time, subj, obj):
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

    def on_out(self, time, subj, obj):
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

    def as_dict(self, **kw):
        d = super(Agent, self).as_dict(**kw)
        d.update(
            login=self.login,
            party=self.party.as_dict() if self.party else None,
        )
        return d

    @property
    def connection(self):
        return self._connection

    @connection.setter
    def connection(self, new_connection):
        self._connection = new_connection

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
        if car not in self.cars:
            self.cars.append(car)
            car.owner = self
            self.add_observer(observer=car, time=time)
            if self.party:
                # сообщить пати, что этот обсёрвер теперь добавлен на карту
                self.party.add_observer_to_party(observer=car, time=time)

    def drop_car(self, car, time, drop_owner=True):
        if car in self.cars:
            if self.party:
                # сообщить пати, что этот обсёрвер теперь убран с карты
                self.party.drop_observer_from_party(observer=car, time=time)
            self.drop_observer(observer=car, time=time)
            if drop_owner:
                car.owner = None
            self.cars.remove(car)

    def on_message(self, connection, message):
        pass

    def on_disconnect(self, connection):
        self.server.stat_log.s_agents_on(time=self.server.get_time(), delta=-1.0)

    def party_before_include(self, party, new_member, time):
        # party - куда включают, agent - кого включают
        #log.debug('ON_BEFORE INCLUDE !!!!!!')
        if not self.is_online:
            return
        car = self.cars[0]
        self._auto_fire_enable = car.is_auto_fire_enable()
        car.fire_auto_enable(enable=False, time=time)
        for obj in self.slave_objects:
            if isinstance(obj, Unit):
                obj.fire_auto_enable(enable=False, time=time)

    def party_after_include(self, party, new_member, time, old_enable=True):
        # party - куда включили, agent - кого включили
        #log.debug('ON_AFTER INCLUDE !!!!!!')
        if not self.is_online:
            return
        self.cars[0].fire_auto_enable(time=time + 0.01, enable=self._auto_fire_enable)
        for obj in self.slave_objects:
            if isinstance(obj, Unit):
                obj.fire_auto_enable(enable=True, time=time + 0.01)

    def party_before_exclude(self, party, old_member, time):
        # party - откуда исключабт, agent - кого исключают
        if not self.is_online:
            return
        car = self.cars[0]
        self._auto_fire_enable = car.is_auto_fire_enable()
        car.fire_auto_enable(enable=False, time=time)
        for obj in self.slave_objects:
            if isinstance(obj, Unit):
                obj.fire_auto_enable(enable=False, time=time)

    def party_after_exclude(self, party, old_member, time):
        # party - откуда исключили, agent - кого исключили
        if not self.is_online:
            return
        self.cars[0].fire_auto_enable(time=time + 0.01, enable=self._auto_fire_enable)
        for obj in self.slave_objects:
            if isinstance(obj, Unit):
                obj.fire_auto_enable(enable=True, time=time + 0.01)

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


class User(Agent):
    # todo: realize
    pass


class AI(Agent):
    # todo: realize in future
    pass
