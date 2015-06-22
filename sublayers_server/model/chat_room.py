# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.events import Event
from sublayers_server.model.messages import ChatRoomMessage, ChatRoomIncludeMessage, ChatRoomExcludeMessage, \
    ChatPartyRoomIncludeMessage, ChatPartyRoomExcludeMessage


def inc_name_number(name):
    clear_name = name.rstrip('0123456789')
    num = int(name[len(clear_name):] or '0') + 1
    return '{}{}'.format(clear_name, num)


class ChatRoomIncludeEvent(Event):
    def __init__(self, room, agent, **kw):
        super(ChatRoomIncludeEvent, self).__init__(server=agent.server, **kw)
        self.room = room
        self.agent = agent

    def on_perform(self):
        super(ChatRoomIncludeEvent, self).on_perform()
        self.room.on_include(agent=self.agent, time=self.time)


class ChatRoomExcludeEvent(Event):
    def __init__(self, room, agent, **kw):
        super(ChatRoomExcludeEvent, self).__init__(server=agent.server, **kw)
        self.room = room
        self.agent = agent

    def on_perform(self):
        super(ChatRoomExcludeEvent, self).on_perform()
        self.room.on_exclude(agent=self.agent, time=self.time)


class ChatRoomMessageEvent(Event):
    def __init__(self, room_name, agent, msg, **kw):
        super(ChatRoomMessageEvent, self).__init__(server=agent.server, **kw)
        self.room_name = room_name
        self.agent = agent
        self.msg = msg

    def on_perform(self):
        super(ChatRoomMessageEvent, self).on_perform()
        room = ChatRoom.search(name=self.room_name)
        if room:
            room.on_message(agent=self.agent, msg=self.msg, time=self.time)


class ChatRoom(object):
    rooms = {}

    def __init__(self, time, name=None, description=''):
        if (name is None) or (name == ''):
            name = self.classname
        while name in self.rooms:
            name = inc_name_number(name)
        self.rooms[name] = self
        self.description = description
        self.name = name
        self.members = []

    @property
    def classname(self):
        return self.__class__.__name__

    @classmethod
    def search(cls, name):
        return cls.rooms.get(name)

    @classmethod
    def get_rooms_by_agent(cls, agent):
        for room in cls.rooms.values():
            if agent in room:
                yield room

    @classmethod
    def resend_rooms_for_agent(cls, agent, time):
        for room in cls.get_rooms_by_agent(agent=agent):
            ChatRoomIncludeMessage(agent=agent, room_name=room.name, time=time).post()

    def as_dict(self):
        return dict(
            name=self.name,
            id=self.id,
        )

    def __len__(self):
        return len(self.members)

    def __str__(self):
        return '<ChatRoom {self.name}/{n}>'.format(self=self, n=len(self))

    id = property(id)

    def __contains__(self, agent):
        if agent is None:
            return False
        for member in self.members:
            if member == agent:
                return True
        return False

    def include(self, agent, time):
        ChatRoomIncludeEvent(room=self, agent=agent, time=time).post()

    def on_include(self, agent, time, cls_message=ChatRoomIncludeMessage):
        if agent in self.members:
            log.warn('Agent %s is already in chat-room %s', agent, self)
            return
        self.members.append(agent)
        cls_message(agent=agent, room_name=self.name, time=time).post()

    def exclude(self, agent, time):
        ChatRoomExcludeEvent(room=self, agent=agent, time=time).post()

    def on_exclude(self, agent, time, cls_message=ChatRoomExcludeMessage):
        if agent not in self.members:
            log.warn('Agent %s not in chat-room %s', agent, self)
            return
        self.members.remove(agent)
        cls_message(agent=agent, room_name=self.name, time=time).post()

    def on_message(self, agent, msg, time):
        for member in self.members:
            ChatRoomMessage(agent=member, room_name=self.name, sender=agent, msg=msg, time=time).post()


class PartyChatRoom(ChatRoom):
    # метод, вызываемый из пати, при удалении пати (нельзя вызывать когда в пати кто-то есть)
    def delete_room(self, time):
        # удаление всех учатсников комнаты
        for member in self.members:
            self.on_exclude(agent=member, time=time)
        # удаление себя из списка rooms
        del self.rooms[self.name]

    def on_include(self, agent, time, cls_message=ChatPartyRoomIncludeMessage):
        super(PartyChatRoom, self).on_include(agent=agent, time=time, cls_message=cls_message)

    def on_exclude(self, agent, time, cls_message=ChatPartyRoomExcludeMessage):
        super(PartyChatRoom, self).on_exclude(agent=agent, time=time, cls_message=cls_message)