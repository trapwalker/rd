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
            room.on_message(agent=self.agent, msg_text=self.msg, time=self.time)


class ChatMessage(object):
    __str_template__ = '<ChatMessage::{self.chat_name} [{self.time}] # {self.sender_login}: {self.text}>'

    def __init__(self, time, text, sender_login, recipients_login, chat_name):
        super(ChatMessage, self).__init__()
        self.time = time
        self.text = text
        self.sender_login = sender_login
        self.recipients_login = recipients_login
        self.chat_name = chat_name

    def __str__(self):
        return self.__str_template__.format(self=self)


class ChatRoom(object):
    rooms = {}
    history_len = 50

    def __init__(self, time, name=None, description=''):
        if (name is None) or (name == ''):
            name = self.classname
        while name in self.rooms:
            name = inc_name_number(name)
        self.rooms[name] = self
        self.description = description
        self.name = name
        self.members = []
        self.history = []

    @property
    def classname(self):
        return self.__class__.__name__

    @classmethod
    def search(cls, name):
        return cls.rooms.get(name)

    @classmethod
    def resend_rooms_for_agent(cls, agent, time):
        for chat in agent.chats:
            chat._send_include_message(agent=agent, time=time)
            chat.send_history(recipient=agent, time=time)

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

    def on_include(self, agent, time):
        if agent in self.members:
            log.warn('Agent %s is already in chat-room %s', agent, self)
            return
        self.members.append(agent)
        agent.chats.append(self)
        self._send_include_message(agent=agent, time=time)
        self.send_history(recipient=agent, time=time)

    def _send_include_message(self, agent, time):
        ChatRoomIncludeMessage(agent=agent, room_name=self.name, time=time).post()

    def exclude(self, agent, time):
        ChatRoomExcludeEvent(room=self, agent=agent, time=time).post()

    def on_exclude(self, agent, time):
        if agent not in self.members:
            log.warn('Agent %s not in chat-room %s', agent, self)
            return
        self.members.remove(agent)
        agent.chats.remove(self)
        self._send_exclude_message(agent=agent, time=time)

    def _send_exclude_message(self, agent, time):
        ChatRoomExcludeMessage(agent=agent, room_name=self.name, time=time).post()

    def on_message(self, agent, msg_text, time):
        # формирование мессаджа
        msg = ChatMessage(time=time, text=msg_text, sender_login=agent.login,
                          recipients_login=[member.login for member in self.members], chat_name=self.name)
        # добавление в историю
        self.history.append(msg)
        if len(self.history) > self.history_len:
            self.history.pop(0)
        for member in self.members:
            ChatRoomMessage(agent=member, msg=msg, time=time).post()

    def send_history(self, recipient, time):
        for msg in self.history:
            if recipient.login in msg.recipients_login:
                ChatRoomMessage(agent=recipient, msg=msg, time=time).post()


class PartyChatRoom(ChatRoom):
    # метод, вызываемый из пати, при удалении пати (нельзя вызывать когда в пати кто-то есть)
    def delete_room(self, time):
        # удаление всех учатсников комнаты
        for member in self.members:
            self.on_exclude(agent=member, time=time)
        # удаление себя из списка rooms
        del self.rooms[self.name]

    def _send_include_message(self, agent, time):
        ChatPartyRoomIncludeMessage(agent=agent, room_name=self.name, time=time).post()

    def _send_exclude_message(self, agent, time):
        ChatPartyRoomExcludeMessage(agent=agent, room_name=self.name, time=time).post()
