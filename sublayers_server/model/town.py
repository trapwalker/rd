# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.units import Unit
from sublayers_server.model.messages import EnterToTown, ExitFromTown, ChangeTownVisitorsMessage
from sublayers_server.model.events import ActivateTownChats
from sublayers_server.model.chat_room import ChatRoom, PrivateChatRoom


class RadioPoint(Observer):
    def __init__(self, time, observing_range=BALANCE.RadioPoint.observing_range, **kw):
        super(RadioPoint, self).__init__(time=time, observing_range=observing_range, **kw)
        self.room = None

    def on_init(self, event):
        super(RadioPoint, self).on_init(event)
        self.room = ChatRoom(time=event.time)

    def on_contact_in(self, time, obj):
        super(RadioPoint, self).on_contact_in(time=time, obj=obj)
        obj.add_to_chat(chat=self, time=time)

    def on_contact_out(self, time, obj):
        super(RadioPoint, self).on_contact_out(time=time, obj=obj)
        obj.del_from_chat(chat=self, time=time)


class Town(Observer):
    __str_template__ = '<{self.classname} #{self.id}> => {self.town_name}'

    def __init__(self, time, town_name, svg_link, observing_range=BALANCE.Town.observing_range, **kw):
        super(Town, self).__init__(time=time, observing_range=observing_range, **kw)
        self.town_name = town_name
        self.svg_link = svg_link
        self.visitors = []
        self.radio_points = []

    def as_dict(self, time):
        d = super(Town, self).as_dict(time=time)
        d.update(town_name=self.town_name)
        return d

    def activate_chats(self, event):
        agent = event.agent
        for chat in self.radio_points:
            log.info('agent invite to %s', chat.room)
            chat.room.include(agent=agent, time=event.time)

    def on_enter(self, agent, time):
        log.info('agent %s coming in town %s', agent, self)
        agent.api.car.delete(time=time)  # удалить машинку агента
        ActivateTownChats(agent=agent, town=self, time=time + 0.1).post()
        EnterToTown(agent=agent, town=self, time=time).post()  # отправть сообщения входа в город

        for visitor in self.visitors:
            ChangeTownVisitorsMessage(agent=visitor, visitor_login=agent.login, action=True, time=time).post()
            ChangeTownVisitorsMessage(agent=agent, visitor_login=visitor.login, action=True, time=time).post()

        agent.current_town = self
        self.visitors.append(agent)

    def on_re_enter(self, agent, time):
        log.info('agent %s re_coming in town %s', agent, self)
        EnterToTown(agent=agent, town=self, time=time).post()  # отправть сообщения входа в город
        for visitor in self.visitors:
            if not visitor is agent:
                ChangeTownVisitorsMessage(agent=agent, visitor_login=visitor.login, action=True, time=time).post()

    def on_exit(self, agent, time):
        log.info('agent %s exit from town %s', agent, self)
        self.visitors.remove(agent)
        agent.current_town = None
        for chat in self.radio_points:
            chat.room.exclude(agent=agent, time=time)
        PrivateChatRoom.close_private(agent=agent, time=time)
        ExitFromTown(agent=agent, town=self, time=time).post()  # отправть сообщения входа в город
        agent.api.update_agent_api(time=time + 0.1, position=self.position(time))

        for visitor in self.visitors:
            ChangeTownVisitorsMessage(agent=visitor, visitor_login=agent.login, action=False, time=time).post()

    def can_come(self, agent):
        if agent.api.car:
            return agent.api.car in self.visible_objects
        return False

    def add_to_chat(self, chat, time):
        super(Town, self).add_to_chat(chat=chat, time=time)
        self.radio_points.append(chat)

    def del_from_chat(self, chat, time):
        super(Town, self).del_from_chat(chat=chat, time=time)
        # info: не нужно делать ездящие города, иначе могут быть проблемы
        self.radio_points.remove(chat)

