# -*- coding: utf-8 -*-
from __future__ import print_function

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.messages import (
    EnterToLocation, ExitFromLocation, ChangeLocationVisitorsMessage, UserExampleSelfMessage, PreEnterToLocation
)
from sublayers_server.model.registry.uri import URI
from sublayers_server.model.events import ActivateLocationChats, Event
from sublayers_server.model.chat_room import ChatRoom, PrivateChatRoom
from sublayers_server.model.registry.classes.trader import TraderRefreshEvent, Trader
from sublayers_server.model.inventory import Inventory



class RadioPoint(Observer):
    def __init__(self, time, **kw):
        super(RadioPoint, self).__init__(time=time, **kw)
        self.room = None
        self.name = self.example.name

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

    def on_enter(self, agent, time):
        agent.on_enter_location(location=self, time=time)
        PreEnterToLocation(agent=agent, location=self, time=time).post()

        for building in self.example.buildings or []:
            head = building.head
            for quest in head and head.quests or []:
                new_quest = quest.instantiate(abstract=False, hirer=head, agent=agent.example)
                if new_quest.generate(agent=agent.example, event=None, time=time):
                    agent.example.add_quest(quest=new_quest, time=time)
                else:
                    del new_quest

        ActivateLocationChats(agent=agent, location=self, time=time + 0.1).post()

        # Добавить агента в список менеджеров мусорки
        if self.inventory is not None:
            self.inventory.add_visitor(agent=agent, time=time)
            self.inventory.add_manager(agent=agent)
        EnterToLocation(agent=agent, location=self, time=time).post()  # отправть сообщения входа в город

        for visitor in self.visitors:  # todo: optimize
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent.user.name, action=True, time=time).post()
            ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor.user.name, action=True, time=time).post()
        agent.current_location = self
        self.visitors.append(agent)
        # todo: review
        Event(
            server=agent.server, time=time,
            callback_after=lambda event: UserExampleSelfMessage(agent=agent, time=event.time).post()
        ).post()

    def on_re_enter(self, agent, time):
        agent.save(time)  # todo: Уточнить можно ли сохранять здесь
        if agent in self.visitors:
            PreEnterToLocation(agent=agent, location=self, time=time).post()
            # todo: review agent.on_enter_location call
            agent.on_enter_location(location=self, time=time)

            EnterToLocation(agent=agent, location=self, time=time).post()  # отправть сообщения входа в город
            for visitor in self.visitors:
                if not visitor is agent:
                    ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor.user.name, action=True, time=time).post()
            self.inventory.send_inventory(agent, time)
        else:
            self.on_enter(agent=agent, time=time)

    def on_exit(self, agent, time):
        self.visitors.remove(agent)
        agent.current_location = None
        agent.on_exit_location(time=time, location=self)
        for chat in self.radio_points:
            chat.room.exclude(agent=agent, time=time)
        PrivateChatRoom.close_privates(agent=agent, time=time)

        # Удалить агента из списка менеджеров мусорки
        if self.inventory is not None:
            self.inventory.del_visitor(agent=agent, time=time)
            self.inventory.del_manager(agent=agent)

        ExitFromLocation(agent=agent, location=self, time=time).post()  # отправть сообщения входа в город
        agent.api.update_agent_api(time=time)
        for visitor in self.visitors:
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent.user.name, action=False, time=time).post()

    def add_to_chat(self, chat, time):
        super(MapLocation, self).add_to_chat(chat=chat, time=time)
        self.radio_points.append(chat)

    def del_from_chat(self, chat, time):
        super(MapLocation, self).del_from_chat(chat=chat, time=time)
        # info: не нужно делать ездящие города, иначе могут быть проблемы
        self.radio_points.remove(chat)

    def is_available(self, agent):
        return agent in self.visitors

    @classmethod
    def get_location_by_uri(cls, uri):
        # todo: Устранить метод
        for location in cls.locations:
            if location.example.uri == uri:
                return location

    def on_enter_npc(self, agent, time, npc_type):
        pass


class Town(MapLocation):
    __str_template__ = '<{self.classname} #{self.id}> => {self.town_name!r}'

    def __init__(self, time, **kw):  # todo: Конструировать на основе example
        super(Town, self).__init__(time=time, **kw)
        self.town_name = self.example.title  # todo: сделать единообразно с радиоточками (там берётся name)

        # Инициализация торговца
        # найти торговца в городе
        for npc in set(self.example.get_npc_list()):
            # todo: Спрятать инициализацию NPC в виртуальный метод, чтобы могли инициализироваться все
            if isinstance(npc, Trader):
                TraderRefreshEvent(time=time, trader=npc, location=self).post()

    def on_exit(self, agent, time):
        super(Town, self).on_exit(agent=agent, time=time)
        # if self.example.trader:
        #     InventoryHideMessage(agent=agent, time=time, inventory_id=str(self.uid) + '_trader').post()

    def as_dict(self, time):
        d = super(Town, self).as_dict(time=time)
        d.update(example=self.example.as_client_dict())
        return d

    @classmethod
    def get_towns(cls):
        for location in cls.locations:
            if isinstance(location, Town):
                yield location

    def on_enter_npc(self, agent, time, npc_type):
        npc = getattr(self.example, npc_type)
        if npc:
            agent.on_enter_npc(npc)


class GasStation(Town):
    @classmethod
    def get_stations(cls):
        for location in cls.locations:
            if isinstance(location, GasStation):
                yield location