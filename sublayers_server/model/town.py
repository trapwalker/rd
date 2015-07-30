# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.messages import EnterToLocation, ExitFromLocation, ChangeLocationVisitorsMessage
from sublayers_server.model.events import ActivateLocationChats
from sublayers_server.model.chat_room import ChatRoom, PrivateChatRoom


class RadioPoint(Observer):
    def __init__(self, name, time, observing_range, **kw):
        super(RadioPoint, self).__init__(time=time, observing_range=observing_range, **kw)
        self.room = None
        self.name = name

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
    def __init__(self, svg_link, **kw):
        super(MapLocation, self).__init__(**kw)
        self.svg_link = svg_link
        self.visitors = []
        self.radio_points = []

    def can_come(self, agent):
        if agent.api.car:
            return agent.api.car in self.visible_objects
        return False

    def activate_chats(self, event):
        agent = event.agent
        for chat in self.radio_points:
            chat.room.include(agent=agent, time=event.time)

    def on_enter(self, agent, time):
        agent.api.car.delete(time=time)  # удалить машинку агента
        ActivateLocationChats(agent=agent, location=self, time=time + 0.1).post()
        EnterToLocation(agent=agent, location=self, time=time).post()  # отправть сообщения входа в город
        for visitor in self.visitors:
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent.login, action=True, time=time).post()
            ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor.login, action=True, time=time).post()
        agent.current_location = self
        self.visitors.append(agent)

    def on_re_enter(self, agent, time):
        EnterToLocation(agent=agent, location=self, time=time).post()  # отправть сообщения входа в город
        for visitor in self.visitors:
            if not visitor is agent:
                ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor.login, action=True, time=time).post()

    def on_exit(self, agent, time):
        self.visitors.remove(agent)
        agent.current_location = None
        for chat in self.radio_points:
            chat.room.exclude(agent=agent, time=time)
        PrivateChatRoom.close_privates(agent=agent, time=time)
        ExitFromLocation(agent=agent, location=self, time=time).post()  # отправть сообщения входа в город
        agent.api.update_agent_api(time=time + 0.1, position=self.position(time))
        for visitor in self.visitors:
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent.login, action=False, time=time).post()

    def add_to_chat(self, chat, time):
        super(MapLocation, self).add_to_chat(chat=chat, time=time)
        self.radio_points.append(chat)

    def del_from_chat(self, chat, time):
        super(MapLocation, self).del_from_chat(chat=chat, time=time)
        # info: не нужно делать ездящие города, иначе могут быть проблемы
        self.radio_points.remove(chat)


class Town(MapLocation):
    __str_template__ = '<{self.classname} #{self.id}> => {self.town_name!r}'

    def __init__(self, town_name, example, observing_range, **kw):  # todo: Конструировать на основе example
        super(Town, self).__init__(observing_range=observing_range, **kw)
        self.town_name = town_name
        self.example = example

    def as_dict(self, time):
        d = super(Town, self).as_dict(time=time)
        d.update(town_name=self.town_name)
        return d


class GasStation(MapLocation):
    def __init__(self, observing_range=BALANCE.GasStation.observing_range, **kw):
        super(GasStation, self).__init__(svg_link='static/img/gas_station/gas_station.svg',
                                         observing_range=observing_range, **kw)