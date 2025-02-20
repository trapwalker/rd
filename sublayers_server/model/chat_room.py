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


class ChatRoomPrivateCreateEvent(Event):
    def __init__(self, agent, recipient_login, msg, **kw):
        super(ChatRoomPrivateCreateEvent, self).__init__(server=agent.server, **kw)
        self.recipient_login = recipient_login
        self.agent = agent
        self.msg = msg

    def on_perform(self):
        super(ChatRoomPrivateCreateEvent, self).on_perform()
        # assert False, '# todo: Get agent by user.pk'
        recipient = self.server.agents_by_name.get(str(self.recipient_login), None)
        if not recipient:
            log.warning('Agent with login %r not found', self.recipient_login)
            return
        if (self.agent.current_location is recipient.current_location) and (self.agent.current_location is not None):
            # todo: refactoring
            if PrivateChatRoom.search_private(agent1=self.agent, agent2=recipient) is None:
                room = PrivateChatRoom(agent=self.agent, recipient=recipient, time=self.time)
                if self.msg != '':
                    ChatRoomMessageEvent(agent=self.agent, room_name=room.name, msg=self.msg, time=self.time + 0.1).post()
            else:
                log.warning('%s try create second private with %s ', self.agent, recipient)


class ChatRoomPrivateCloseEvent(Event):
    def __init__(self, agent, chat_name, **kw):
        super(ChatRoomPrivateCloseEvent, self).__init__(server=agent.server, **kw)
        self.chat_name = chat_name
        self.agent = agent

    def on_perform(self):
        super(ChatRoomPrivateCloseEvent, self).on_perform()
        chat = ChatRoom.search(name=self.chat_name)
        if not chat or not isinstance(chat, PrivateChatRoom):
            log.warning('Private Chat with name %s not found', self.chat_name)
            return
        if self.agent in chat:
            chat.exclude(agent=self.agent, time=self.time)
        else:
            log.warning('%s not in chat: %s', self.agent, self.chat_name)


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

    # login: {times: [time, time, time], silent: 2}
    # Если больше 5 сообщений за 5 секунд - бан на silent минут, затем silent * 2.
    # И так до перезагрузки клиента (можно сделать до перезагрузки сервера)
    silent_candidate = {}

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
        return u'<ChatRoom {self.name}/{n}>'.format(self=self, n=len(self))

    id = property(id)

    def __contains__(self, agent):
        if agent is None:
            return False
        return agent in self.members

    def include(self, agent, time):
        if not agent or agent.agent_type == 'ai':
            return
        ChatRoomIncludeEvent(room=self, agent=agent, time=time).post()

    def on_include(self, agent, time):
        if agent in self:
            log.warning('Agent %s is already in chat-room %s', agent, self)
            return
        self.members.append(agent)
        agent.chats.append(self)
        self._send_include_message(agent=agent, time=time)
        self.send_history(recipient=agent, time=time)

    def _send_include_message(self, agent, time):
        ChatRoomIncludeMessage(agent=agent, room_name=self.name, chat_type=self.classname, time=time).post()

    def exclude(self, agent, time):
        if not agent or agent.agent_type == 'ai':
            return
        ChatRoomExcludeEvent(room=self, agent=agent, time=time).post()

    def on_exclude(self, agent, time):
        if agent not in self:
            log.warning('Agent %s not in chat-room %s', agent, self)
        else:
            self.members.remove(agent)
        if self not in agent.chats:
            log.warning('Chat %s not in agent-chats %s', self, agent)
        else:
            agent.chats.remove(self)
        self._send_exclude_message(agent=agent, time=time)

    def _send_exclude_message(self, agent, time):
        ChatRoomExcludeMessage(agent=agent, room_name=self.name, time=time).post()

    def on_message(self, agent, msg_text, time):
        if agent.user and agent.user.get_silent_seconds() <= 0:
            login = agent.print_login()
            # формирование мессаджа
            msg = ChatMessage(time=time, text=msg_text, sender_login=login,
                              recipients_login=[member.print_login() for member in self.members], chat_name=self.name)
            # добавление в историю
            self.history.append(msg)
            if len(self.history) > self.history_len:
                self.history.pop(0)
            for member in self.members:
                ChatRoomMessage(agent=member, msg=msg, time=time).post()

            silent_info = self.silent_candidate.get(login, None)
            if not silent_info:
                self.silent_candidate[login] = dict(times=[time], silent=2)
            else:
                times = silent_info["times"]
                times.append(time)
                times = filter(lambda t: t > time - 5.0, times)
                silent_info["times"] = times
                if len(times) > 5:
                    if agent.user:
                        agent.user.silent(minutes=silent_info["silent"])
                        log.info("AutoSilent %s for %s min.", agent, silent_info["silent"])
                    silent_info["silent"] *= 2
        else:
            # Значит на пользователе Silent
            msg = ChatMessage(time=time, text="You are silent.", sender_login=agent.print_login(),
                              recipients_login=[agent.print_login()], chat_name=self.name)
            ChatRoomMessage(agent=agent, msg=msg, time=time).post()

    def send_history(self, recipient, time):
        for msg in self.history:
            if recipient.print_login() in msg.recipients_login:
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


class PrivateChatRoom(ChatRoom):
    @classmethod
    def search_private(cls, agent1, agent2):
        for chat in cls.rooms.values():
            if isinstance(chat, cls):
                if (agent1 in chat) and (agent2 in chat):
                    return chat
        return None

    @classmethod
    def close_privates(cls, agent, time):
        for chat in agent.chats:
            if isinstance(chat, cls):
                if agent in chat:
                    chat.exclude(agent=agent, time=time)

    def __init__(self, agent, recipient, time):
        assert isinstance(agent._login, unicode)
        assert isinstance(recipient._login, unicode)
        super(PrivateChatRoom, self).__init__(time=time, name=(u"{!s} -> {!s}".format(agent._login, recipient.user.name)))  # todo: use unicode
        self.include(agent=agent, time=time)
        self.include(agent=recipient, time=time)

    def on_exclude(self, agent, time):
        super(PrivateChatRoom, self).on_exclude(agent=agent, time=time)

        if len(self.members) == 0:
            # удаление себя из списка rooms
            del self.rooms[self.name]

        self.on_message(agent=agent, msg_text=u'Пользователь покинул чат', time=time)


class GlobalChatRoom(ChatRoom):
    def on_include(self, agent, time):
        if agent not in self:
            self.members.append(agent)
        self._send_include_message(agent=agent, time=time)
        self.send_history(recipient=agent, time=time)
        log.info("GlobalChatRoom: include %s", agent)

    def on_exclude(self, agent, time):
        if agent in self:
            self.members.remove(agent)
        self._send_exclude_message(agent=agent, time=time)
        log.info("GlobalChatRoom: exclude %s", agent)

        # Если агент отключился, то удалить из списка
        ChatRoom.silent_candidate.pop(agent.print_login(), None)
