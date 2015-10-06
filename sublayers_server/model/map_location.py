# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.messages import (
    EnterToLocation, ExitFromLocation, ChangeLocationVisitorsMessage,
    ExamplesShowMessage, TraderInventoryShowMessage, InventoryHideMessage,
)
from sublayers_server.model.events import ActivateLocationChats
from sublayers_server.model.chat_room import ChatRoom, PrivateChatRoom


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

    def can_come(self, agent):
        if agent.api.car:
            return agent.api.car in self.visible_objects
        return False

    def activate_chats(self, event):
        agent = event.agent
        for chat in self.radio_points:
            chat.room.include(agent=agent, time=event.time)

    def on_enter(self, agent, time):
        # Раздеплоить машинку агента
        if agent.car:
            agent.car.displace(time=time)
            # todo: agent.on_enter_location call
        self.send_inventory_info(agent=agent, time=time)

        ActivateLocationChats(agent=agent, location=self, time=time + 0.1).post()
        EnterToLocation(agent=agent, location=self, time=time).post()  # отправть сообщения входа в город
        for visitor in self.visitors:
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent.login, action=True, time=time).post()
            ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor.login, action=True, time=time).post()
        agent.current_location = self
        self.visitors.append(agent)

        # Отправить инвентарь из экземпляра на клиент, при условии, что есть машинка
        if agent.example.car:
            ExamplesShowMessage(agent=agent, time=time).post()

    def on_re_enter(self, agent, time):
        agent.save(time)  # todo: Уточнить можно ли сохранять здесь
        if agent in self.visitors:
            # Отправить инвентарь из экземпляра на клиент, при условии, что есть машинка
            if agent.example.car:
                ExamplesShowMessage(agent=agent, time=time).post()

            self.send_inventory_info(agent=agent, time=time)

            EnterToLocation(agent=agent, location=self, time=time).post()  # отправть сообщения входа в город
            for visitor in self.visitors:
                if not visitor is agent:
                    ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor.login, action=True, time=time).post()
        else:
            self.on_enter(agent=agent, time=time)

    def on_exit(self, agent, time):
        self.visitors.remove(agent)
        agent.current_location = None
        for chat in self.radio_points:
            chat.room.exclude(agent=agent, time=time)
        PrivateChatRoom.close_privates(agent=agent, time=time)
        ExitFromLocation(agent=agent, location=self, time=time).post()  # отправть сообщения входа в город
        agent.api.update_agent_api(time=time + 0.1)
        for visitor in self.visitors:
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent.login, action=False, time=time).post()
        InventoryHideMessage(agent=agent, time=time, inventory_id=agent.uid).post()

    def add_to_chat(self, chat, time):
        super(MapLocation, self).add_to_chat(chat=chat, time=time)
        self.radio_points.append(chat)

    def del_from_chat(self, chat, time):
        super(MapLocation, self).del_from_chat(chat=chat, time=time)
        # info: не нужно делать ездящие города, иначе могут быть проблемы
        self.radio_points.remove(chat)

    @classmethod
    def get_location_by_uri(cls, uri):
        # todo: Устранить метод
        for location in cls.locations:
            if location.example.uri == uri:
                return location

    def send_inventory_info(self, agent, time):
        pass


class Town(MapLocation):
    __str_template__ = '<{self.classname} #{self.id}> => {self.town_name!r}'

    def __init__(self, **kw):  # todo: Конструировать на основе example
        super(Town, self).__init__(**kw)
        self.town_name = self.example.title  # todo: сделать единообразно с радиоточками (там берётся name)

    def on_exit(self, agent, time):
        super(Town, self).on_exit(agent=agent, time=time)
        if self.example.trader:
            InventoryHideMessage(agent=agent, time=time, inventory_id=str(self.uid) + '_trader').post()

    def as_dict(self, time):
        d = super(Town, self).as_dict(time=time)
        d.update(town_name=self.town_name)
        return d

    @classmethod
    def get_towns(cls):
        for location in cls.locations:
            if isinstance(location, Town):
                yield location

    def send_inventory_info(self, agent, time):
        super(Town, self).send_inventory_info(agent=agent, time=time)
        if self.example.trader:
            TraderInventoryShowMessage(agent=agent, time=time, town_id=self.uid).post()


class GasStation(MapLocation):
    @classmethod
    def get_stations(cls):
        for location in cls.locations:
            if isinstance(location, GasStation):
                yield location