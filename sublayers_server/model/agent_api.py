# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging

log = logging.getLogger(__name__)

from uuid import UUID
from sublayers_server.model import messages
from sublayers_server.model.vectors import Point
from sublayers_server.model.api_tools import API, public_method, basic_mode
# from sublayers_server.model.weapon_objects.rocket import RocketStartEvent
# from sublayers_server.model.slave_objects.scout_droid import ScoutDroidStartEvent
# from sublayers_server.model.slave_objects.stationary_turret import StationaryTurretStartEvent
from sublayers_server.model.party import Party, PartyGetPartyInfoEvent, PartyGetAllInvitesEvent, \
    PartyGetPartyUserInfoEvent
from sublayers_server.model.events import (
    Event, EnterToMapLocation, ReEnterToLocation, ExitFromMapLocation, ShowInventoryEvent,
    HideInventoryEvent, ItemActionInventoryEvent, ItemActivationEvent, ItemPreActivationEvent, MassiveLootAroundEvent,
    LootPickEvent, EnterToNPCEvent, StrategyModeInfoObjectsEvent, TakeItemInventoryEvent, TakeAllInventoryEvent)
from sublayers_server.model.transaction_events import (
    TransactionGasStation, TransactionHangarSell, TransactionHangarBuy, TransactionParkingLeave,
    TransactionParkingSelect, TransactionArmorerApply, TransactionMechanicApply, TransactionTunerApply,
    TransactionTraderApply, TransactionSetRPGState, TransactionMechanicRepairApply, BagExchangeStartEvent)
from sublayers_server.model.units import Unit, Bot
from sublayers_server.model.chat_room import (
    ChatRoom, PrivateChatRoom, ChatRoomMessageEvent, ChatRoomPrivateCreateEvent, ChatRoomPrivateCloseEvent, )
from sublayers_server.model.map_location import Town, GasStation
from sublayers_server.model.barter import Barter, InitBarterEvent, AddInviteBarterMessage
from sublayers_server.model.console import Namespace, Console, LogStream, StreamHub
from sublayers_server.model.registry.classes.item import MapWeaponRocketItem
from sublayers_server.model.quest_events import OnNote, OnQuestChange
from tornado.options import options

import tornado.gen

# todo: Проверить допустимость значений входных параметров

import random


class AgentConsoleEchoMessage(messages.Message):
    pass


class AgentMessageStream(object):
    def __init__(self, agent, message_class=AgentConsoleEchoMessage):
        """
        @param sublayers_server.model.agents.Agent agent: Receiver of message
        @param type message_class: class of message, AgentConsoleEchoMessage by default
        """
        self.agent = agent
        self.message_class = message_class

    def write(self, text):
        # todo: html format of message
        self.message_class(agent=self.agent, time=self.agent.server.get_time(), comment=text).post()


class AgentConsoleNamespace(Namespace):
    agent = None
    api = None

    def test(self, *av, **kw):
        self.write('test command:: {}, {}'.format(repr(av), repr(kw)))

    def party(self, *av):
        # todo: options of party create
        if av:
            cmd, av = av[0], av[1:]
            cmd = cmd.strip().lower()
            if cmd == 'new':
                self.api.set_party(name=av[0] if av else None)
            elif cmd == 'leave':
                self.api.set_party()
            elif cmd == 'invite':
                for name in av:
                    self.api.send_invite(username=name)
        else:
            party = self.agent.party
            if party:
                self.write(u'Your party is {}'.format(party.as_html()))
            else:
                self.write(u'You are not in party')

    def die(self):
        self.agent.die(time=self.agent.server.get_time())

    def gg(self):  # good game
        self.agent.die(time=self.agent.server.get_time())

    def damage(self, value=0):
        self.agent.hit(time=self.agent.server.get_time(), value=int(value))

    def kick(self, *av):
        for name in av:
            self.api.send_kick(username=name)

    def dropcar(self):
        self.api.delete_car()

    # todo: Завернуть сообщения консоли в отдельные события
    def money(self, value=None):
        if value is not None:
            value = int(value)
            if value > 1000:
                self.write(random.choice([  # todo: вынести вариации диалогов в ямл
                    u'А харя не треснет?',
                    u'Поди заработай, халявщик!',
                    u'Не евгей ли вы случайно, судагь?',
                    u'Слипнется.',
                    u'Может тебе ещё и ключи от тачки, где лут лежит?',
                    u'Губа не дура',
                    u'Да ты охренел!',
                ]))
            self.agent.example.set_balance(time=self.agent.server.get_time(), new_balance=value)

        self.write('You have {} money.'.format(self.agent.balance))
        return self.agent.balance

    def exp(self, value):
        self.agent.example.set_exp(dvalue=int(value), time=self.agent.server.get_time())

    def param(self, name=None):
        if name and self.agent.car:
            # todo: use self.write()
            log.debug(
                'Agent %s  have param %s = %s',
                self.agent,
                name,
                self.agent.car.example.get_modify_value(param_name=name, example_agent=self.agent.example),
            )

    def save(self):
        self.agent.server.save(time=self.agent.server.get_time())
        self.write('Server saved.')

    def reset(self, *names):
        agents_by_name = self.agent.server.agents_by_name
        names = names or [self.agent.user.name]
        if '*' in names:
            names = agents_by_name.keys()

        for name_to_reset in names:
            agent = agents_by_name.get(name_to_reset, None)
            if agent:
                self.api.send_kick(username=name_to_reset)
                agent.example.reset()

    # def quest(self, *args):
    #     if not args:
    #         pass  # todo: Вывести перечень активных квестов
    #     elif args[0] == 'get':
    #         for q in args[1:]:
    #             try:
    #                 q = self.agent.server.reg[q]
    #             except:
    #                 log.error('Quest %s is not found', q)
    #                 raise
    #             log.debug('Abstract quest %s selected', q)
    #             quest = q.instantiate()
    #             log.debug('Quest %s instantiated', quest)
    #             quest.generate(agents=self.agent, time=self.agent.server.get_time())
    #             # todo: store quest to agent or global storage
    #             log.debug('Quest %s started', quest)

    def qi(self):
        for quest in self.agent.example.quests:
            log.info('QUEST: {}'.format(quest))


class UpdateAgentAPIEvent(Event):
    def __init__(self, api, **kw):
        super(UpdateAgentAPIEvent, self).__init__(server=api.agent.server, **kw)
        self.api = api

    def on_perform(self):
        super(UpdateAgentAPIEvent, self).on_perform()
        self.api.on_update_agent_api(time=self.time)


class InitTimeEvent(Event):
    def __init__(self, agent, **kw):
        super(InitTimeEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(InitTimeEvent, self).on_perform()
        # синхронизация времени на клиенте
        messages.InitTime(agent=self.agent, time=self.time).post()


class SetPartyEvent(Event):
    def __init__(self, agent, name=None, description=u'', **kw):
        super(SetPartyEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.name = name
        self.description = description

    def on_perform(self):
        super(SetPartyEvent, self).on_perform()
        log.info('%r try to set or create party %r', self.agent.user.name, self.name)
        if self.name is None:
            if self.agent.party:
                self.agent.party.exclude(self.agent, time=self.time)
        else:
            party = Party.search(self.name)
            if party is None:
                party = Party(time=self.time, owner=self.agent, name=self.name, description=self.description)
            elif self.agent not in party:
                party.include(self.agent, time=self.time)
        # todo: save parties


class SendInviteEvent(Event):
    def __init__(self, agent, username, **kw):
        super(SendInviteEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.username = username

    def on_perform(self):
        super(SendInviteEvent, self).on_perform()
        # todo: проблемы с русским языком
        user = self.agent.server.agents_by_name.get(self.username, None)
        if user is None:
            messages.PartyErrorMessage(agent=self.agent, comment='Unknown recipient', time=self.time).post()
            return
        party = self.agent.party
        if party is None:
            party = Party(owner=self.agent, time=self.time)
        party.invite(sender=self.agent, recipient=user, time=self.time)


class DeleteInviteEvent(Event):
    def __init__(self, agent, invite_id, **kw):
        super(DeleteInviteEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.invite_id = invite_id

    def on_perform(self):
        super(DeleteInviteEvent, self).on_perform()
        self.agent.delete_invite(invite_id=self.invite_id, time=self.time)


class SendKickEvent(Event):
    def __init__(self, agent, username, **kw):
        super(SendKickEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.username = username

    def on_perform(self):
        super(SendKickEvent, self).on_perform()
        # todo: проблемы с русским языком
        party = self.agent.party
        if party is None:
            # todo: assert', warning'и -- ок. Зачем сообщения клиенту?
            messages.PartyErrorMessage(agent=self.agent, comment='Invalid party', time=self.time).post()
            return

        user = self.agent.server.agents_by_name.get(self.username, None)
        if user is None or user not in party:
            messages.PartyErrorMessage(agent=self.agent, comment='Unknown agent for kick', time=self.time).post()
            return
        party.kick(kicker=self.agent, kicked=user, time=self.time)


class SendChangeCategoryEvent(Event):
    def __init__(self, agent, username, **kw):
        super(SendChangeCategoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.username = username

    def on_perform(self):
        super(SendChangeCategoryEvent, self).on_perform()
        # todo: проблемы с русским языком
        party = self.agent.party
        if party is None:
            # todo: Зачем все эти сообщения клиенту?!
            messages.PartyErrorMessage(agent=self.agent, comment='Invalid party', time=self.time).post()
            return
        if party.owner is not self.agent:
            messages.PartyErrorMessage(agent=self.agent, comment='You do not have permission', time=self.time).post()
            return

        user = self.agent.server.agents_by_name.get(self.username, None)
        if user is None or user not in party:
            messages.PartyErrorMessage(agent=self.agent, comment='Unknown agent for set category',
                                       time=self.time).post()
            return
        member = party.get_member_by_agent(agent=user)
        if member.category == 1:
            member.category = 2
            for member in party.members:
                messages.PartyInfoMessage(agent=member.agent, time=self.time, party=party).post()
            return
        if member.category == 2:
            member.category = 1
            for member in party.members:
                messages.PartyInfoMessage(agent=member.agent, time=self.time, party=party).post()
            return


class AgentAPI(API):
    # todo: do not make instance of API for all agents
    def __init__(self, agent):
        """
        @type agent: sublayers_server.model.agents.Agent
        """
        super(AgentAPI, self).__init__()
        self.agent = agent
        self.car = None
        agent.api = self  # todo: убрать
        self.update_agent_api()

        agent_output_stream = StreamHub(
            LogStream(logger=log, level=logging.DEBUG),
            AgentMessageStream(agent=agent, message_class=AgentConsoleEchoMessage),
        )
        self.console = Console(
            root=AgentConsoleNamespace(
                agent=agent,
                api=self,
                write=agent_output_stream.write,
            ),
            stream_log=LogStream(logger=log, level=logging.DEBUG),
            stream=agent_output_stream,
        )

    def send_init_car_map(self, time):
        messages.InitCar(agent=self.agent, time=time).post()
        # todo: если машинка не новая, то отправитьв полное состояние (перезарядки и тд)

        # эффекты
        # for effect in self.car.effects:
        # effect.send_message()

        # сначала формируем список всех видимых объектов
        vo_list = []  # список отправленных машинок, чтобы не отправлять дважды от разных обсёрверов
        for obs in self.agent.observers:
            if not (obs in vo_list) and (obs != self.car):
                vo_list.append(obs)
            for vo in obs.visible_objects:
                if not (vo in vo_list) and (vo != self.car):
                    vo_list.append(vo)

        # добавляем к списку видимых объектов все города на карте
        vo_list += list(Town.get_towns())
        vo_list += list(GasStation.get_stations())

        # отправляем все видимые объекты, будто мы сами их видим, и сейчас не важно кто их видит
        for vo in vo_list:
            messages.See(
                agent=self.agent,
                subj=self.car,
                obj=vo,
                time=time,
                is_first=True,
            ).post()

        # Для всех обсёрверов данного агента прислать сообщение видимости
        for obs in self.agent.observers:
            messages.SetObserverForClient(agent=self.agent, time=time, obj=obs, enable=True).post()

        # отобразить информацию о стрельбе по нашей машинке и нашей машинки
        self.car.send_auto_fire_messages(agent=self.agent, action=True, time=time)

        # для каждого VO узнать информацию о стрельбе
        for vo in vo_list:
            if isinstance(vo, Unit) and (vo.hp_state is not None):
                vo.send_auto_fire_messages(agent=self.agent, action=True, time=time)

        # переотправить чаты, в которых есть агент
        ChatRoom.resend_rooms_for_agent(agent=self.agent, time=time)

        # отправить зоны
        for zone in self.agent.car.zones:
            messages.ZoneMessage(agent=self.agent, subj=self.agent.car, name=zone.name, is_start=True, time=time).post()

        # отправить активные бартеры на клиент
        for barter in self.agent.barters:
            if barter.recipient is self.agent and barter.state == 'unactive':
                AddInviteBarterMessage(agent=self.agent, time=time, barter=barter).post()

    def update_agent_api(self, time=None):
        # todo: review(svp)
        InitTimeEvent(time=self.agent.server.get_time(), agent=self.agent).post()
        UpdateAgentAPIEvent(api=self, time=time if time is not None else self.agent.server.get_time()).post()

        # For ReInit Time
        t0 = self.agent.server.get_time()
        for add_mul in xrange(1, 6):
            InitTimeEvent(time=t0 + add_mul * 5, agent=self.agent).post()

    def on_update_agent_api(self, time):
        self.agent.log.info("on_update_agent_api")
        messages.InitAgent(agent=self.agent, time=time).post()
        messages.UserExampleSelfMessage(agent=self.agent, time=time).post()
        messages.QuestsInitMessage(agent=self.agent, time=time).post()

        # Отослать все пати инвайты
        PartyGetAllInvitesEvent(agent=self.agent, time=self.agent.server.get_time()).post()

        # Отправка сообщений для журнала
        messages.JournalParkingInfoMessage(agent=self.agent, time=time).post()

        if self.agent.current_location is not None:
            log.debug('Need reenter to location')
            ReEnterToLocation(agent=self.agent, location=self.agent.current_location, time=time).post()
            ChatRoom.resend_rooms_for_agent(agent=self.agent, time=time)
            return

        if self.agent.example.car and not self.agent.car:
            self.make_car(time=time)

        if self.agent.car:
            assert not self.car.limbo and self.car.hp(time=time) > 0, 'Car HP <= 0 or limbo'
            self.car = self.agent.car
            self.send_init_car_map(time=time)
            return

        # если мы дошли сюда, значит агент последний раз был не в городе и у него уже нет машинки. вернуть его в город
        last_town = self.agent.example.last_town
        self.agent.current_location = last_town
        if self.agent.current_location is not None:
            # todo: Выяснить для чего это нужно (!!!)
            log.debug('Need reenter to location')
            ReEnterToLocation(agent=self.agent, location=self.agent.current_location, time=time).post()
            ChatRoom.resend_rooms_for_agent(agent=self.agent, time=time)
            return

    def make_car(self, time):
        self.car = Bot(time=time, example=self.agent.example.car, server=self.agent.server, owner=self.agent)
        self.agent.append_car(car=self.car, time=time)

    @public_method
    def send_create_party_from_template(self, name, description):
        assert name is None or isinstance(name, unicode)
        assert description is None or isinstance(description, unicode)
        self.agent.log.info("send_create_party_from_template name={!r}".format(name))
        self.set_party(name=name, description=description)

    @public_method
    def send_join_party_from_template(self, name):
        assert name is None or isinstance(name, unicode)
        self.agent.log.info("send_join_party_from_template name={!r}".format(name))
        self.set_party(name=name)

    @public_method
    def set_party(self, name=None, description=u''):
        # todo: review
        assert name is None or isinstance(name, unicode)
        assert description is None or isinstance(description, unicode)
        self.agent.log.info("set_party name={!r}".format(name))
        SetPartyEvent(agent=self.agent, name=name, description=description,
                      time=self.agent.server.get_time()).post()

    @public_method
    def get_party_info(self, name):
        assert name is None or isinstance(name, unicode)
        self.agent.log.info("get_party_user_info name={!r}".format(name))
        PartyGetPartyInfoEvent(agent=self.agent, name=name, time=self.agent.server.get_time()).post()

    @public_method
    def get_party_user_info(self, name):
        assert name is None or isinstance(name, unicode)
        self.agent.log.info("get_party_user_info name={!r}".format(name))
        PartyGetPartyUserInfoEvent(agent=self.agent, name=name, time=self.agent.server.get_time()).post()

    @public_method
    def send_invite(self, username):
        assert username is None or isinstance(username, unicode)
        self.agent.log.info("send_invite username={!r}".format(username))
        SendInviteEvent(agent=self.agent, username=username, time=self.agent.server.get_time()).post()

    @public_method
    def delete_invite(self, invite_id):
        self.agent.log.info("delete_invite username={}".format(invite_id))
        DeleteInviteEvent(agent=self.agent, invite_id=invite_id, time=self.agent.server.get_time()).post()

    @public_method
    def send_kick(self, username):
        assert username is None or isinstance(username, unicode)
        self.agent.log.info("send_kick username={!r}".format(username))
        SendKickEvent(agent=self.agent, username=username, time=self.agent.server.get_time()).post()

    @public_method
    def send_change_category(self, username):
        assert username is None or isinstance(username, unicode)
        self.agent.log.info("send_change_category username={}".format(username))
        SendChangeCategoryEvent(agent=self.agent, username=username, time=self.agent.server.get_time()).post()

    @public_method
    def fire_discharge(self, side):
        self.agent.log.info("fire_discharge side={}".format(side))
        if self.car.limbo or not self.car.is_alive:
            return
        self.car.fire_discharge(side=side, time=self.agent.server.get_time())

    @public_method
    def fire_auto_enable(self, enable):
        # log.debug('Car - %s, set auto fire - %s', self.car, enable)
        self.agent.log.info("fire_auto_enable enable={}".format(enable))
        if self.car.limbo or not self.car.is_alive:
            return
        self.car.fire_auto_enable(enable=enable, time=self.agent.server.get_time())

    @public_method
    def chat_message(self, room_name, msg):
        self.agent.log.info("chat_message room_name={!r}  msg={!r}".format(room_name, msg))
        ChatRoomMessageEvent(room_name=room_name, agent=self.agent, msg=msg,
                             time=self.agent.server.get_time()).post()

    @public_method
    def send_slow_mine(self):
        return
        self.agent.log.info("send_slow_mine")
        if self.car.limbo or not self.car.is_alive:
            return
            # SlowMineStartEvent(starter=self.car, time=self.agent.server.get_time()).post()

    @public_method
    def send_stationary_turret(self):
        return
        self.agent.log.info("send_stationary_turret")
        if self.car.limbo or not self.car.is_alive:
            return
            # StationaryTurretStartEvent(starter=self.car, time=self.agent.server.get_time()).post()

    @public_method
    def send_scout_droid(self, x, y):
        pass
        # if self.car.limbo or not self.car.is_alive:
        #     return
        # assert x and y
        # p = Point(x, y)
        # ScoutDroidStartEvent(starter=self.car, target=p, time=self.agent.server.get_time()).post()

    @public_method
    def set_motion(self, x, y, cc, turn, comment=None):
        self.agent.log.info("set_motion x={} y={} cc={} turn={}".format(x, y, cc, turn))
        if self.car.limbo or not self.car.is_alive:
            return
        p = None
        if x and y:
            p = Point(x, y)
        self.car.set_motion(target_point=p, cc=cc, turn=turn, comment=comment, time=self.agent.server.get_time())

    @public_method
    def delete_car(self):
        self.agent.log.info("delete_car")  # todo: узнать что это за метод и где он используется
        if self.car.limbo or not self.car.is_alive:
            return
        self.car.delete(time=self.agent.server.get_time())

    @public_method
    def console_cmd(self, cmd):
        log.debug('Agent %r cmd: %r', self.agent.user.name, cmd)
        self.agent.log.info('Agent {} cmd: {!r}'.format(self.agent.user.name, cmd))
        try:
            self.console.on_cmd(cmd.lstrip('/'))
        except Exception as e:
            # log.warning('Agent {} try cmd: {!r} and generate exception {}'.format(self.agent.user.name, cmd, e.__class__.__name__))
            log.warning('Agent {} try cmd: {!r} and generate exception'.format(self.agent.user.name, cmd))

    @basic_mode
    @public_method
    def create_private_chat(self, recipient, msg):
        # log.info('agent %s try create private room with %s', self.agent, recipient)
        ChatRoomPrivateCreateEvent(agent=self.agent, recipient_login=recipient, msg=msg,
                                   time=self.agent.server.get_time()).post()

    @basic_mode
    @public_method
    def close_private_chat(self, name):
        # log.info('agent %s try close private chat %s', self.agent, name)
        ChatRoomPrivateCloseEvent(agent=self.agent, chat_name=name, time=self.agent.server.get_time()).post()

    @basic_mode
    @public_method
    def get_private_chat_members(self, name):
        # log.info('agent %s try close private chat %s', self.agent, name)

        chat = ChatRoom.search(name=name)
        if (chat is not None) and (isinstance(chat, PrivateChatRoom)) and (self.agent in chat.members):
            messages.GetPrivateChatMembersMessage(agent=self.agent,
                                                  chat=chat,
                                                  time=self.agent.server.get_time()).post()

    @basic_mode
    @public_method
    def enter_to_location(self, location_id):
        # log.info('agent %s want enter to location is %s', self.agent, town_id)
        EnterToMapLocation(agent=self.agent, obj_id=location_id, time=self.agent.server.get_time()).post()

    @basic_mode
    @public_method
    def exit_from_location(self):
        # log.info('agent %s want exit from location is %s', self.agent, town_id)
        ExitFromMapLocation(agent=self.agent, time=self.agent.server.get_time()).post()

    @basic_mode
    @public_method
    def enter_to_npc(self, npc_node_hash):
        log.info('agent %s want enter to npc %s', self.agent, npc_node_hash)
        # todo: resolve NPC by node_hash ##quest
        EnterToNPCEvent(agent=self.agent, npc=npc_node_hash, time=self.agent.server.get_time()).post()

    @basic_mode
    @public_method
    def enter_to_building(self, head_node_hash, build_name):
        log.info('agent %s want enter to build [%s] with head: %s', self.agent, build_name, head_node_hash)

    @basic_mode
    @public_method
    def exit_from_npc(self, npc_node_hash):
        log.info('agent %s want exit from npc %s', self.agent, npc_node_hash)

    @basic_mode
    @public_method
    def exit_from_building(self, head_node_hash, build_name):
        log.info('agent %s want exit from build [%s] with head: %s', self.agent, build_name, head_node_hash)

    @public_method
    def show_inventory(self, owner_id):
        self.agent.log.info('show_inventory owner_id={}'.format(owner_id))
        # log.info('agent %s want show inventory from %s', self.agent, owner_id)
        ShowInventoryEvent(agent=self.agent, owner_id=owner_id, time=self.agent.server.get_time()).post()

    @public_method
    def hide_inventory(self, owner_id):
        self.agent.log.info('hide_inventory owner_id={}'.format(owner_id))
        # log.info('agent %s want hide inventory from %s', self.agent, owner_id)
        HideInventoryEvent(agent=self.agent, owner_id=owner_id, time=self.agent.server.get_time()).post()

    @public_method
    def item_action_inventory(self, start_owner_id=None, start_pos=None, end_owner_id=None, end_pos=None, count=-1):
        self.agent.log.info('item_action_inventory start_owner_id={} start_pos={} end_owner_id={} end_pos={} count={}'.format(start_owner_id, start_pos, end_owner_id, end_pos, count))
        ItemActionInventoryEvent(agent=self.agent, start_owner_id=start_owner_id, start_pos=start_pos,
                                 end_owner_id=end_owner_id, end_pos=end_pos, time=self.agent.server.get_time(),
                                 count=count).post()

    @public_method
    def take_all_inventory(self, owner_id):
        self.agent.log.info('try take all inventory from owner_id={}'.format(owner_id))
        TakeAllInventoryEvent(agent=self.agent, owner_id=owner_id, time=self.agent.server.get_time()).post()

    @public_method
    def take_item_inventory(self, owner_id, position, other_id):
        self.agent.log.info('try take item_pos={} from owner_id={} to other_id={}'.format(position, owner_id, other_id))
        TakeItemInventoryEvent(agent=self.agent, owner_id=owner_id, position=position, other_id=other_id,
                               time=self.agent.server.get_time()).post()

    @public_method
    def massive_loot_around(self):
        self.agent.log.info('try massive_loot_around')
        MassiveLootAroundEvent(agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def get_balance_cls(self, balance_cls_name):
        pass
        # log.info('agent %s want get balance_cls_name %s', self.agent, balance_cls_name)
        # messages.BalanceClsInfo(agent=self.agent, time=self.agent.server.get_time(),
        # balance_cls_name=balance_cls_name).post()

    @public_method
    def activate_item(self, owner_id, position, target_id):
        # log.info('agent %s want activate item in position %s for target_id %s', self.agent, position, target_id)
        # self.agent.log.info('activate_item owner_id={} position={} target_id={}'.format(owner_id, position, target_id))
        ItemPreActivationEvent(agent=self.agent, owner_id=owner_id, position=position, target_id=target_id,
                               time=self.agent.server.get_time()).post()

    @public_method
    def cancel_activation_item(self):
        if self.agent.car.current_item_action:
            self.agent.car.current_item_action.cancel(time=self.agent.server.get_time())

    @basic_mode
    @public_method
    def fuel_station_active(self, fuel, tank_list, npc_node_hash):
        # log.info('agent %s want active fuel station, with value=%s  and tl = %s', self.agent, fuel, tank_list)
        TransactionGasStation(time=self.agent.server.get_time(), agent=self.agent, fuel=fuel,
                              tank_list=tank_list, npc_node_hash=npc_node_hash).post()

    @public_method
    def get_loot(self, poi_id):
        log.info('agent %r want loot =%r', self.agent, poi_id)
        self.agent.log.info('get_loot poi_id={}'.format(poi_id))
        LootPickEvent(time=self.agent.server.get_time(), agent=self.agent, poi_stash_id=poi_id).post()

    # Ангар

    @basic_mode
    @public_method
    def sell_car_in_hangar(self, npc_node_hash):
        log.info('agent %r sell car', self.agent)
        TransactionHangarSell(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def buy_car_in_hangar(self, car_number, npc_node_hash):
        log.info('agent %r want buy car, with number=%r', self.agent, car_number)
        TransactionHangarBuy(time=self.agent.server.get_time(), agent=self.agent, car_number=car_number, npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def get_hangar_info(self, npc_node_hash):
        messages.HangarInfoMessage(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash).post()

    # Стоянка

    @basic_mode
    @public_method
    def parking_leave_car(self, npc_node_hash):
        log.info('agent %r sell car', self.agent)
        TransactionParkingLeave(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def parking_select_car(self, car_number, npc_node_hash):
        log.info('agent %r want buy car, with number=%r', self.agent, car_number)
        TransactionParkingSelect(time=self.agent.server.get_time(), agent=self.agent, car_number=car_number, npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def get_parking_info(self, npc_node_hash):
        messages.ParkingInfoMessage(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def get_parking_bag_exchange(self, car_uid, npc_node_hash):
        BagExchangeStartEvent(time=self.agent.server.get_time(), agent=self.agent, car_uid=car_uid,
                              npc_node_hash=npc_node_hash).post()

    # Оружейник

    @basic_mode
    @public_method
    def armorer_apply(self, armorer_slots, npc_node_hash):
        TransactionArmorerApply(time=self.agent.server.get_time(), agent=self.agent, armorer_slots=armorer_slots,
                                npc_node_hash=npc_node_hash).post()

    # Механик

    @basic_mode
    @public_method
    def mechanic_apply(self, mechanic_slots, npc_node_hash):
        TransactionMechanicApply(time=self.agent.server.get_time(), agent=self.agent, mechanic_slots=mechanic_slots,
                                 npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def mechanic_repair_apply(self, hp, npc_node_hash):
        TransactionMechanicRepairApply(time=self.agent.server.get_time(), agent=self.agent, hp=hp,
                                 npc_node_hash=npc_node_hash).post()

    # Тюнер

    @basic_mode
    @public_method
    def tuner_apply(self, tuner_slots, npc_node_hash):
        TransactionTunerApply(time=self.agent.server.get_time(), agent=self.agent, tuner_slots=tuner_slots,
                              npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def tuner_cancel(self):
        pass

    # Торговец
    @basic_mode
    @public_method
    def get_trader_info(self, npc_node_hash):
        messages.TraderInfoMessage(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def trader_apply(self, player_table, trader_table, npc_node_hash):
        TransactionTraderApply(time=self.agent.server.get_time(), agent=self.agent, player_table=player_table,
                               trader_table=trader_table, npc_node_hash=npc_node_hash).post()

    # Бартер
    @public_method
    def init_barter(self, recipient_login):
        self.agent.log.info('init_barter recipient_login={!r}'.format(recipient_login))
        log.debug('Agent %s invite %s to barter', self.agent, recipient_login)
        InitBarterEvent(initiator=self.agent, recipient_login=recipient_login,
                        time=self.agent.server.get_time()).post()

    @public_method
    def out_barter_range(self, recipient_login):
        self.agent.log.info('out_barter_range recipient_login={!r}'.format(recipient_login))
        recipient = self.agent.server.agents_by_name.get(str(recipient_login), None)
        if not recipient:
            return
        for barter in self.agent.barters:
            if (recipient is barter.recipient) or (recipient is barter.initiator):
                barter.cancel(time=self.agent.server.get_time())

    @public_method
    def activate_barter(self, barter_id):
        self.agent.log.info('activate_barter barter_id={}'.format(barter_id))
        barter = Barter.get_barter(barter_id=barter_id, agent=self.agent)
        if barter:
            barter.activate(recipient=self.agent, time=self.agent.server.get_time())

    @public_method
    def lock_barter(self, barter_id):
        self.agent.log.info('lock_barter barter_id={}'.format(barter_id))
        barter = Barter.get_barter(barter_id=barter_id, agent=self.agent)
        if barter:
            barter.lock(agent=self.agent, time=self.agent.server.get_time())

    @public_method
    def unlock_barter(self, barter_id):
        self.agent.log.info('unlock_barter barter_id={}'.format(barter_id))
        barter = Barter.get_barter(barter_id=barter_id, agent=self.agent)
        if barter:
            barter.unlock(time=self.agent.server.get_time())

    @public_method
    def cancel_barter(self, barter_id, recipient_login):
        self.agent.log.info('cancel_barter barter_id={} recipient_login={!r}'.format(barter_id, recipient_login))
        barter = Barter.get_barter(agent=self.agent, barter_id=barter_id, recipient_login=recipient_login)
        if barter:
            barter.cancel(time=self.agent.server.get_time())

    @public_method
    def table_money_barter(self, barter_id, money):
        self.agent.log.info('table_money_barter barter_id={} money={}'.format(barter_id, money))
        barter = Barter.get_barter(barter_id=barter_id, agent=self.agent)
        if barter:
            barter.set_money(agent=self.agent, time=self.agent.server.get_time(), money=money)

    # RPG
    @basic_mode
    @public_method
    def get_trainer_info(self, npc_node_hash):
        messages.TrainerInfoMessage(time=self.agent.server.get_time(),
                                    agent=self.agent,
                                    npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def set_rpg_state(self, npc_node_hash, skills, buy_skills, perks):
        # log.debug('Agent %s try set rpg state', self.agent)
        TransactionSetRPGState(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash,
                               skills=skills, buy_skills=buy_skills, perks=perks).post()

    @public_method
    def get_about_self(self):
        self.agent.log.info('get_about_self')
        messages.UserExampleSelfShortMessage(agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def set_about_self(self, text):
        self.agent.log.info('set_about_self text={!r}'.format(text))
        self.agent.example.about_self = text
        messages.UserExampleSelfShortMessage(agent=self.agent, time=self.agent.server.get_time()).post()

    # Квесты

    @public_method
    def quest_note_action(self, uid, result):
        self.agent.log.info('quest_note_action uid={} result={}'.format(uid, result))
        # log.info('Agent[%s] Quest Note <%s> Action: %s', self.agent, uid, result)
        # todo: найти ноту с этим ID и вызвать какую-то реакцию
        uid = UUID(uid)

        note = self.agent.example.get_note(uid)
        if not note:
            log.warning('Note #{} is not found'.format(uid))
            return

        server = self.agent.server

        for q in self.agent.example.quests_active:
            OnNote(server=server, time=server.get_time(), quest=q, note_uid=uid, result=result).post()

    @public_method
    def quest_activate(self, quest_uid):
        self.agent.log.info('quest_activate quest_uid={}'.format(quest_uid))
        self.agent.example.start_quest(UUID(quest_uid), time=self.agent.server.get_time(), server=self.agent.server)
        # todo: данный эвент должен вызываться при смене состояния квеста
        for q in self.agent.example.quests_active:
            server = self.agent.server
            OnQuestChange(server=server, quest=q, time=server.get_time() + 0.5, target_quest_uid=quest_uid).post()

    # Запрос инфы о другом игроке

    @public_method
    def get_interaction_info(self, player_nick):
        self.agent.log.info('get_interaction_info player_nick={!r}'.format(player_nick))
        messages.InteractionInfoMessage(time=self.agent.server.get_time(),
                                        agent=self.agent,
                                        player_nick=player_nick).post()

    # Административные методы
    @public_method
    def get_tiles_admin(self, x, y):
        self.agent.log.info('get_tiles_admin for coord: {} : {}'.format(x, y))
        from sublayers_server.model.tile_archive import get_tiles_admin
        get_tiles_admin(long(x), long(y))
        messages.AdminArchiveCompleteMessage(agent=self.agent, time=self.agent.server.get_time()).post()

    # Панель быстрого доступа

    @public_method
    def set_quick_item(self, index, position):
        self.agent.log.info('set_quick_item index={}, position={}'.format(index, position))
        if self.agent.car and self.agent.car.quick_consumer_panel:
            self.agent.car.quick_consumer_panel.set_item(index=index, position=position, time=self.agent.server.get_time())

    @public_method
    def activate_quick_item(self, index, target_id):
        self.agent.log.info('activate_quick_item index={}, target_id={}'.format(index, target_id))
        if self.agent.car and self.agent.car.quick_consumer_panel:
            self.agent.car.quick_consumer_panel.activate_item(index=index, target_id=target_id,
                                                              time=self.agent.server.get_time())

    @public_method
    def swap_quick_items(self, index1, index2):
        self.agent.log.info('swap_quick_items index1={}, index2={}'.format(index1, index2))
        if self.agent.car and self.agent.car.quick_consumer_panel:
            self.agent.car.quick_consumer_panel.swap_items(index1=index1, index2=index2, time=self.agent.server.get_time())

    @public_method
    def get_quick_item_info(self):
        self.agent.log.info('get_quick_item_info')
        from sublayers_server.model.quick_consumer_panel import QuickConsumerPanelInfoMessage
        if self.agent.car and self.agent.car.quick_consumer_panel:
            QuickConsumerPanelInfoMessage(owner=self.agent.car.quick_consumer_panel, time=self.agent.server.get_time()).post()

    # Запрос объектов в стратегическом режиме
    @basic_mode
    @public_method
    def get_strategy_mode_info_objects(self):
        StrategyModeInfoObjectsEvent(agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def teleport(self, x, y):
        self.agent.log.info('teleport x={}, y={}'.format(x, y))
        p = Point(long(x), long(y))
        if self.agent.car and p:
            self.agent.save(time=self.agent.server.get_time())
            ex_car = self.agent.car.example
            self.agent.car.displace(time=self.agent.server.get_time())

            def set_new_position(event):
                ex_car.position = p
                self.update_agent_api(time=event.time + 0.1)

            Event(server=self.agent.server, time=self.agent.server.get_time() + 0.1, callback_after=set_new_position).post()

    @public_method
    def quick_play_again(self, car_index=0):
        self.agent.log.info('quick_play_again with index: %s', car_index)
        def callback(*kw):
            api.update_agent_api(time=api.agent.server.get_time())

        api = self
        if (options.mode != 'quick') or (self.agent.car is not None):
            # todo: зафиксировать факт жульничества
            log.warning('Lie!!!!')
            return
        self.agent.user.car_index = car_index
        tornado.gen.IOLoop.instance().add_future(self.agent.init_example_car(), callback=callback)

    @public_method
    def quick_teaching_answer(self, teaching):
        self.agent.log.info('quick_teaching_answer teaching={}'.format(teaching))
        if teaching:
            assert self.agent.example.quick_flag
            self.agent.create_teaching_quest_map(time=self.agent.server.get_time())
        else:
            self.agent.set_teaching_state('cancel')
            # self.agent.armory_shield_off(Event(server=self.agent.server, time=self.agent.server.get_time()))

    @public_method
    def get_ping_set_fps(self, fps):
        messages.PingInfoMessage(agent=self.agent, time=self.agent.server.get_time()).post()
        current_ping = None if self.agent.connection is None else self.agent.connection._current_ping
        self.agent.log.info('FPS = {!r}   Ping = {!r}'.format(fps, current_ping))

    @public_method
    def agent_log(self, message):
        self.agent.log.info('agent_log: {!r}'.format(message))