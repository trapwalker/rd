# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.balance import BALANCE
from sublayers_server.model.units import Unit
from sublayers_server.model.messages import InviteToTown, EnterToTown, ExitFromTown
from sublayers_server.model.events import ActivateTownChats


class RadioPoint(Observer):
    def __init__(self, time, conference_name, observing_range=BALANCE.RadioPoint.observing_range, **kw):
        super(RadioPoint, self).__init__(time=time, observing_range=observing_range, **kw)
        self.conference_name = conference_name
        self.xmpp = self.server.app.xmpp_manager
        self.room_jid = None

    def on_init(self, event):
        super(RadioPoint, self).on_init(event)
        if self.xmpp is None:
            return
        self.room_jid = self.xmpp.create_room(room=self.conference_name)

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

    def on_contact_in(self, time, obj):
        super(Town, self).on_contact_in(time=time, obj=obj)
        if isinstance(obj, Unit) and (obj.owner is not None):
            # отправить сообщение, что данный агент может войти в город
            InviteToTown(agent=obj.owner, town=self, invite=True, time=time).post()

    def on_contact_out(self, time, obj):
        super(Town, self).on_contact_out(time=time, obj=obj)
        if isinstance(obj, Unit) and (obj.owner is not None):
            # отправить сообщение, что данный агент больше не может войти в город
            InviteToTown(agent=obj.owner, town=self, invite=False, time=time).post()

    def as_dict(self, time):
        d = super(Town, self).as_dict(time=time)
        d.update(town_name=self.town_name)
        return d

    def activate_chats(self, event):
        agent = event.agent
        for chat in self.radio_points:
            log.info('agent invite to %s', chat.room_jid)
            agent.add_xmpp_room(room_jid=chat.room_jid)

    def on_enter(self, agent, time):
        log.info('agent %s coming in town %s', agent, self)
        agent.api.car.delete(time=time)  # удалить машинку агента
        ActivateTownChats(agent=agent, town=self, time=time + 1).post()
        EnterToTown(agent=agent, town=self, time=time).post()  # отправть сообщения входа в город
        self.visitors.append(agent)

    def on_exit(self, agent, time):
        log.info('agent %s exit from town %s', agent, self)
        self.visitors.remove(agent)
        for chat in self.radio_points:
            agent.del_xmpp_room(room_jid=chat.room_jid)
        ExitFromTown(agent=agent, town=self, time=time).post()  # отправть сообщения входа в город
        agent.api.update_agent_api(time=time, position=self.position(time))

    def can_come(self, agent):
        if agent.api.car:
            return agent.api.car in self.visible_objects
        return False

    def add_to_chat(self, chat, time):
        super(Town, self).add_to_chat(chat=chat, time=time)
        self.radio_points.append(chat)

    def del_from_chat(self, chat, time):
        super(Town, self).remove_from_chat(chat=chat, time=time)
        # info: не нужно делать ездящие города, иначе могут быть проблемы
        self.radio_points.remove(chat)

