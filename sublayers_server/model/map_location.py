# -*- coding: utf-8 -*-
from __future__ import print_function

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.messages import (
    EnterToLocation, ExitFromLocation, ChangeLocationVisitorsMessage, UserExampleSelfMessage, PreEnterToLocation
)
from sublayers_server.model.game_log_messages import LocationLogMessage
from sublayers_server.model.registry_me.uri import URI
from sublayers_server.model.vectors import Point
from sublayers_server.model.events import ActivateLocationChats, Event, event_deco
from sublayers_server.model.chat_room import ChatRoom, PrivateChatRoom
from sublayers_server.model.registry_me.classes.trader import TraderRefreshEvent, Trader
from sublayers_server.model.inventory import Inventory

from tornado.options import options
import random


class RadioPoint(Observer):
    def __init__(self, time, **kw):
        super(RadioPoint, self).__init__(time=time, **kw)
        self.room = None
        self.name = self.example.radio_point_name

    def on_init(self, event):
        super(RadioPoint, self).on_init(event)
        self.room = ChatRoom(time=event.time, name=self.name)

    def on_contact_in(self, time, obj):
        super(RadioPoint, self).on_contact_in(time=time, obj=obj)
        obj.add_to_chat(chat=self, time=time)

    def on_contact_out(self, time, obj):
        super(RadioPoint, self).on_contact_out(time=time, obj=obj)
        obj.del_from_chat(chat=self, time=time)


class MapLocation(Observer):
    locations = []

    def __init__(self, **kw):
        super(MapLocation, self).__init__(**kw)
        self.visitors = []
        self.radio_points = []
        # log.debug('Map_location example %s', self.example.uri)
        self.locations.append(self)

        # Свалка
        self.inventory = Inventory(max_size=100, owner=self)

    def can_come(self, agent):
        if agent.api.car:
            return agent.api.car in self.visible_objects
        return False

    def activate_chats(self, event):
        agent = event.agent
        for chat in self.radio_points:
            chat.room.include(agent=agent, time=event.time)

    def on_enter(self, agent, event):
        agent.on_enter_location(location=self, event=event)  # todo: (!)
        PreEnterToLocation(agent=agent, location=self, time=event.time).post()

        for building in self.example.buildings or []:
            head = building.head
            for quest in head and head.quests or []:
                new_quest = quest.instantiate(abstract=False, hirer=head)
                new_quest.agent = agent.example
                if new_quest.generate(event=event):
                    agent.example.profile.add_quest(quest=new_quest, time=event.time)
                else:
                    del new_quest

        ActivateLocationChats(agent=agent, location=self, time=event.time + 0.1).post()

        # Добавить агента в список менеджеров мусорки
        if self.inventory is not None:
            self.inventory.add_visitor(agent=agent, time=event.time)
            self.inventory.add_manager(agent=agent)
        EnterToLocation(agent=agent, location=self, time=event.time).post()  # отправть сообщения входа в город
        LocationLogMessage(agent=agent, location=self, action='enter', time=event.time).post()

        for visitor in self.visitors:  # todo: optimize
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent.user.name, action=True, time=event.time).post()
            ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor.user.name, action=True, time=event.time).post()
        agent.current_location = self
        self.visitors.append(agent)
        # todo: review
        Event(
            server=agent.server, time=event.time,
            callback_after=lambda event: UserExampleSelfMessage(agent=agent, time=event.time).post()
        ).post()

    def on_re_enter(self, agent, event):
        agent.save(event.time)  # todo: Уточнить можно ли сохранять здесь
        if agent in self.visitors:
            PreEnterToLocation(agent=agent, location=self, time=event.time).post()
            # todo: review agent.on_enter_location call
            agent.on_enter_location(location=self, event=event)
            EnterToLocation(agent=agent, location=self, time=event.time).post()  # отправть сообщения входа в город
            LocationLogMessage(agent=agent, location=self, action='enter', time=event.time).post()

            for visitor in self.visitors:
                if not visitor is agent:
                    ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor.user.name, action=True, time=event.time).post()
            self.inventory.send_inventory(agent, event.time)
        else:
            self.on_enter(agent=agent, event=event)

    def on_exit(self, agent, event):
        self.visitors.remove(agent)
        agent.current_location = None
        agent.on_exit_location(location=self, event=event)
        for chat in self.radio_points:
            chat.room.exclude(agent=agent, time=event.time)  # todo: Пробросить event вместо time ##refactor
        PrivateChatRoom.close_privates(agent=agent, time=event.time)  # todo: Пробросить event вместо time ##refactor

        # Удалить агента из списка менеджеров мусорки
        if self.inventory is not None:
            self.inventory.del_visitor(agent=agent, time=event.time)  # todo: Пробросить event вместо time ##refactor
            self.inventory.del_manager(agent=agent)

        ExitFromLocation(agent=agent, location=self, time=event.time).post()  # отправть сообщения входа в город
        LocationLogMessage(agent=agent, action='exit', location=self, time=event.time).post()

        agent.api.update_agent_api(time=event.time)  # todo: Пробросить event вместо time? ##refactor
        for visitor in self.visitors:
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent.user.name, action=False, time=event.time).post()

    def add_to_chat(self, chat, time):
        super(MapLocation, self).add_to_chat(chat=chat, time=time)
        self.radio_points.append(chat)

    def del_from_chat(self, chat, time):
        super(MapLocation, self).del_from_chat(chat=chat, time=time)
        # info: не нужно делать ездящие города, иначе могут быть проблемы
        self.radio_points.remove(chat)

    def is_available(self, agent, time=None):
        return agent in self.visitors

    @classmethod
    def get_location_by_uri(cls, uri):
        # todo: Устранить метод
        for location in cls.locations:
            if location.example.uri == uri:
                return location

    def on_enter_npc(self, event):
        pass


class Town(MapLocation):
    __str_template__ = '<{self.classname} #{self.id}> => {self.town_name!r}'

    def __init__(self, time, **kw):  # todo: Конструировать на основе example
        super(Town, self).__init__(time=time, **kw)
        self.town_name = self.example.title  # todo: сделать единообразно с радиоточками (там берётся radio_point_name)

        # Инициализация торговца
        # найти торговца в городе
        for npc in set(self.example.get_npc_list()):
            # todo: Спрятать инициализацию NPC в виртуальный метод, чтобы могли инициализироваться все
            if isinstance(npc, Trader) and not options.quick_debug:
                TraderRefreshEvent(time=time, trader=npc, location=self).post()

    # def on_exit(self, agent, event):
    #     super(Town, self).on_exit(agent=agent, event=event)
    #     # if self.example.trader:
    #     #     InventoryHideMessage(agent=agent, time=event.time, inventory_id=str(self.uid) + '_trader').post()

    def as_dict(self, time):
        d = super(Town, self).as_dict(time=time)
        d.update(example=self.example.as_client_dict())
        return d

    @classmethod
    def get_towns(cls):
        for location in cls.locations:
            if isinstance(location, Town):
                yield location

    def on_enter_npc(self, event):
        super(Town, self).on_enter_npc(event)
        # todo: Проверить законность входа в переданного NPC в этой локации
        event.agent.on_enter_npc(event=event)


class GasStation(Town):
    @classmethod
    def get_stations(cls):
        for location in cls.locations:
            if isinstance(location, GasStation):
                yield location


class MapRespawn(Observer):
    def on_init(self, event):
        super(MapRespawn, self).on_init(event)
        self.respawn(time=event.time)

    def can_see_me(self, subj, time, obj_pos=None, subj_pos=None):
        return False

    def get_respawn_cls(self, name):
        # todo: сделать правильное получение класса по имени, возможно через реестровые объекты
        import sublayers_server.model.quick_game_power_up as PowerUps
        res = getattr(PowerUps, name, None)
        assert res is not None
        return res

    @event_deco  # если в итоге не подойдёт, то сделать @event_deco_obj и создавать там Objective event
    def respawn(self, event):
        self.respawn(time=event.time + self.example.respawn_time + random.randint(-5, 5))  # создать эвент на новый респавн
        respawn_objects = self.example.respawn_objects
        if not respawn_objects:
            return
        resp_object_proto = respawn_objects[random.randint(0, len(respawn_objects) - 1)]
        pos = Point.random_point(self.position(event.time), self.example.respawn_radius)
        # resp_object_ex = resp_object_proto.instantiate(fixtured=False)
        # yield resp_object_ex.load_references()
        # log.info('respawn [%s] %s %s %s', self, event.time, resp_object_proto.model_class_name, pos)
        klass = self.get_respawn_cls(resp_object_proto.model_class_name)
        klass(time=event.time, example=resp_object_proto, server=self.server, position=pos)
