# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging

log = logging.getLogger(__name__)

from uuid import UUID
from sublayers_server.model import messages
from sublayers_server.model.vectors import Point
from sublayers_server.model.api_tools import API, public_method, basic_mode, call_constrains, access_level
from sublayers_server.model.party import Party, PartyGetPartyInfoEvent, PartyGetAllInvitesEvent, \
    PartyGetPartyUserInfoEvent
from sublayers_server.model.events import (
    Event, EnterToMapLocation, ReEnterToLocation, ExitFromMapLocation, ShowInventoryEvent, event_deco,
    HideInventoryEvent, ItemActionInventoryEvent, ItemActivationEvent, ItemPreActivationEvent, MassiveLootAroundEvent,
    LootPickEvent, EnterToNPCEvent, StrategyModeInfoObjectsEvent, TakeItemInventoryEvent, TakeAllInventoryEvent)
from sublayers_server.model.transaction_events import (
    TransactionGasStation, TransactionHangarSell, TransactionHangarBuy, TransactionParkingLeave, TransactionGirlApply,
    TransactionParkingSelect, TransactionArmorerApply, TransactionMechanicApply, TransactionTunerApply,
    TransactionTraderApply, TransactionSetRPGState, TransactionMechanicRepairApply, BagExchangeStartEvent,
    TransactionBuyInsurance)
from sublayers_server.model.units import Unit, Bot
from sublayers_server.model.chat_room import (
    ChatRoom, PrivateChatRoom, ChatRoomMessageEvent, ChatRoomPrivateCreateEvent, ChatRoomPrivateCloseEvent, )
from sublayers_server.model.map_location import Town, GasStation
from sublayers_server.model.barter import Barter, InitBarterEvent, AddInviteBarterMessage
from sublayers_server.model.console import Namespace, Console, LogStream, StreamHub
from sublayers_server.model.quest_events import OnNote, OnQuestChange, OnCancel
from tornado.options import options

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

    @access_level(2)
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

    @access_level(2)
    def damage(self, value=0):
        self.agent.hit(time=self.agent.server.get_time(), value=int(value))

    def kick(self, *av):
        for name in av:
            self.api.send_kick(username=name)

    def dropcar(self):
        self.api.delete_car()

    # todo: Завернуть сообщения консоли в отдельные события
    @access_level(2)
    def money(self, value=None, user=None):
        agent = None
        if user is None:
            agent = self.agent
        elif isinstance(user, basestring):
            agent = self.agent.server.agents_by_name.get(user.strip())

        if agent is None:
            self.write(u'User `{}` is not found.'.format(user))
            log.warning(u'Странный пользователь передан команде /money: {!r}'.format(user))
            return None

        if value is not None:
            value = int(value)
            if value > 100000:
                self.write(random.choice([  # todo: вынести вариации диалогов в ямл
                    u'А харя не треснет?',
                    u'Поди заработай, халявщик!',
                    u'Не евгей ли вы случайно, судагь?',
                    u'Слипнется.',
                    u'Может тебе ещё и ключи от тачки, где лут лежит?',
                    u'Губа не дура',
                    u'Да ты охренел!',
                ]))
            agent.example.profile.set_balance(time=self.agent.server.get_time(), new_balance=value)

        self.write('User {agent._login} have {agent.balance} money.'.format(agent=agent))
        return agent.balance

    @access_level(2)
    def exp(self, value):
        self.agent.example.profile.set_exp(dvalue=int(value), time=self.agent.server.get_time())

    @access_level(2)
    def car_exp(self, value):
        if self.agent.example.profile.car:
            self.agent.example.profile.car.set_exp(dvalue=int(value), time=self.agent.server.get_time(), model_agent=self.agent)

    @access_level(2)
    def karma(self, value):
        self.agent.example.profile.set_karma(value=int(value), time=self.agent.server.get_time())

    def clear_quests(self, value=None):
        if value == 'all' or value == u'all':
            self.agent.example.profile.quests_unstarted = []
            self.agent.example.profile.quests_ended = []
        self.agent.example.profile.quests_active = []
        self.agent.example.profile.notes = []
        t = self.agent.server.get_time()
        # self.agent.on_save(time=t)
        messages.RefreshMessage(agent=self.agent, time=t + 1, comment='Quests cleared').post()

    def cqf(self):  # Fix Class Quest
        from sublayers_world.registry.quests.class_quests import ClassTypeQuest
        from sublayers_world.registry.quests.class_quest import ClassQuest

        for_delete_quests = []
        for_delete_notes = []
        for q in self.agent.example.profile.quests_active:
            if isinstance(q, (ClassTypeQuest, ClassQuest)):
                for_delete_quests.append(q)
                for note in self.agent.example.profile.notes:
                    if note.quest_uid == q.uid:
                        for_delete_notes.append(note)

        for q in for_delete_quests:
            self.agent.example.profile.quests_active.remove(q)

        for note in for_delete_notes:
            self.agent.example.profile.notes.remove(note)

        messages.RefreshMessage(agent=self.agent, time=self.agent.server.get_time() + 1, comment='Class Quests cleared').post()
        self.regenerate_quests()


    def regenerate_quests(self):
        agent = self.agent
        location = agent.current_location

        def ttt(event):
            location.generate_quests(event=event, agent=agent)

        if location:
            Event(server=agent.server, time=agent.server.get_time(), callback_after=ttt).post()

    def watching(self):
        if self.agent.car and self.agent.car.is_alive:
            log.debug("%s stealth_indicator = %s", self.agent, self.agent.stealth_indicator)
            for agent in self.agent.car.subscribed_agents.keys():
                if agent is not self.agent:  # info: пати можно будет учесть здесь
                    log.debug("%s", agent)
            for town in self.agent.watched_locations:
                log.debug("%s", town)

    def param(self, name=None):
        if name and self.agent.car:
            # todo: use self.write()
            log.debug(
                'Agent %s  have param %s = %s',
                self.agent,
                name,
                self.agent.car.example.profile.get_modify_value(param_name=name, example_agent=self.agent.example),
            )

    def save(self):
        self.agent.server.save(time=self.agent.server.get_time())
        self.write('Server saved.')

    def reset(self, *names):
        agents_by_name = self.agent.server.agents_by_name
        names = names or [self.agent._login]
        if '*' in names:
            names = agents_by_name.keys()

        for name_to_reset in names:
            agent = agents_by_name.get(name_to_reset, None)
            if agent:
                self.api.send_kick(username=name_to_reset)
                agent.example.profile.reset()

    # def quest(self, *args):
    #     if not args:
    #         pass  # todo: Вывести перечень активных квестов
    #     elif args[0] == 'get':
    #         for q in args[1:]:
    #             try:
    #                 q = self.agent.server.reg.get(q)
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
        for quest in self.agent.example.profile.quests:
            log.info('QUEST: {}'.format(quest))

    @access_level(3)
    def sys_message(self, message):
        time = self.agent.server.get_time()
        for agent in self.agent.server.agents.values():
            if agent.connection:
                messages.SystemChatMessage(text=message, agent=agent, time=time).post()

    @access_level(2)
    def npc_rel(self, dvalue):
        time = self.agent.server.get_time()
        town = self.agent.current_location
        npcs = town and town.example.get_npc_list()
        int_dval = int(dvalue)
        for npc in npcs:
            self.agent.example.profile.set_relationship(time=time, npc=npc, dvalue=int_dval)

    @access_level(2)
    def bot_info(self, name):
        agent = self.agent.server.agents_by_name.get(name, None)
        if agent:
            from sublayers_server.model.agents import AI
            from sublayers_server.model.tileid import Tileid
            if agent.car and isinstance(agent, AI):
                time = self.agent.server.get_time()
                pos = agent.car.position(time)
                x, y, z = Tileid(long(pos.x), long(pos.y), 26).parent(12).xyz()
                route = agent.event_quest and agent.event_quest.dc and agent.event_quest.dc.route
                r = '{} with route={}, ({:.2f}, {:.2f}) EventQuest={} ActionQuest={}'.format(agent.print_login(), route, x, y, agent.event_quest, agent.action_quest)
                log.debug(r)
                self.write(r)
        else:
            self.write('Not found')

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
    def __init__(self, agent, name=None, description=u'', exp_share_type=False, **kw):
        super(SetPartyEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.name = name
        self.description = description
        self.exp_share_type = exp_share_type

    def on_perform(self):
        super(SetPartyEvent, self).on_perform()
        log.info('%r try to set or create party %r', self.agent._login, self.name)
        if self.name is None:
            if self.agent.party:
                self.agent.party.exclude(self.agent, time=self.time)
        else:
            party = Party.search(self.name)
            if party is None:
                party = Party(time=self.time,
                              owner=self.agent,
                              name=self.name,
                              description=self.description,
                              exp_share=self.exp_share_type)
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

        # print('init_time')
        # t0 = self.agent.server.get_time()
        # for add_mul in xrange(1, 6):
        #     InitTimeEvent(time=t0 + add_mul * 5, agent=self.agent).post()

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

        # Отправить текущее состояние StealthIndicator
        messages.ChangeStealthIndicator(agent=self.agent, time=time, stealth=self.agent.stealth_indicator).post()

        # отправить активные бартеры на клиент
        for barter in self.agent.barters:
            if barter.recipient is self.agent and barter.state == 'unactive':
                AddInviteBarterMessage(agent=self.agent, time=time, barter=barter).post()

    def update_agent_api(self, time=None):
        # todo: review(svp)
        InitTimeEvent(time=self.agent.server.get_time(), agent=self.agent).post()
        UpdateAgentAPIEvent(api=self, time=time if time is not None else self.agent.server.get_time()).post()

    def on_update_agent_api(self, time):
        self.agent.log.info("on_update_agent_api")
        messages.InitAgent(agent=self.agent, time=time).post()
        messages.UserExampleSelfMessage(agent=self.agent, time=time).post()
        messages.QuestsInitMessage(agent=self.agent, time=time).post()

        # Отослать все пати инвайты
        PartyGetAllInvitesEvent(agent=self.agent, time=self.agent.server.get_time()).post()

        # Отправка сообщений для журнала
        messages.JournalParkingInfoMessage(agent=self.agent, time=time).post()

        if self.agent.current_location is not None and self.agent.example.profile.in_location_flag:
            self.agent.log.info("enter to location %s and in_location_flag=%s", self.agent.current_location, self.agent.example.profile.in_location_flag)
            ReEnterToLocation(agent=self.agent, location=self.agent.current_location, time=time).post()
            ChatRoom.resend_rooms_for_agent(agent=self.agent, time=time)
            return

        if self.agent.example.profile.car and not self.agent.car:
            self.make_car(time=time)

        if self.agent.car:
            assert not self.car.limbo and self.car.hp(time=time) > 0, 'Car HP <= 0 or limbo'
            self.car = self.agent.car
            self.send_init_car_map(time=time)
            self.agent.current_location = None
            self.agent.log.info("Setup car<%s> to map", self.car)
            return

        # если мы дошли сюда, значит агент последний раз был не в городе и у него уже нет машинки. вернуть его в город
        last_town = self.agent.example.profile.last_town
        self.agent.current_location = last_town
        self.agent.log.info("enter to last_town %r ", last_town)
        if self.agent.current_location is not None:
            # todo: Выяснить для чего это нужно (!!!)
            self.agent.example.profile.car = self.agent.example.profile.insurance.car  # Восстановление машинки из страховки
            self.agent.example.profile.insurance.car = None
            if self.agent.example.profile.car:  # Если страховка базовая, то не будет машинки
                self.agent.example.profile.car.position = self.agent.current_location.position(time)
            ReEnterToLocation(agent=self.agent, location=self.agent.current_location, time=time).post()
            ChatRoom.resend_rooms_for_agent(agent=self.agent, time=time)
            return

        log.warning('on_update_agent_api Agent placing error %s', self.agent)
        self.agent.log.warning('on_update_agent_api Agent placing error  last_town=%r  curr_loc=%s', last_town, self.agent.current_location)

    @event_deco
    def on_simple_update_agent_api(self, event):
        self.agent.log.info("on_simple_update_agent_api")
        if self.agent.example.profile.car and not self.agent.car:
            self.make_car(time=event.time)
            assert not self.car.limbo and self.car.hp(time=event.time) > 0, 'Car HP <= 0 or limbo'
            self.car = self.agent.car
            self.send_init_car_map(time=event.time)
            self.agent.current_location = None
            self.agent.log.info("Setup car<%s> to map", self.car)
            return
        log.warning('on_simple_update_agent_api Agent placing error %s', self.agent)
        self.agent.log.warning('on_simple_update_agent_api Agent dont have car')

    def make_car(self, time):
        self.car = Bot(time=time, example=self.agent.example.profile.car, server=self.agent.server, owner=self.agent)
        self.agent.append_car(car=self.car, time=time)

    @public_method
    def send_create_party_from_template(self, name, description, exp_share_type):
        assert name is None or isinstance(name, unicode)
        assert description is None or isinstance(description, unicode)
        assert exp_share_type is None or isinstance(exp_share_type, bool)
        self.agent.log.info("send_create_party_from_template name={!r}".format(name))
        self.agent.adm_log(type="party", text="send_create_party_from_template name={!r}".format(name))
        self.set_party(name=name, description=description, exp_share_type=exp_share_type)

    @public_method
    def send_join_party_from_template(self, name):
        assert name is None or isinstance(name, unicode)
        self.agent.log.info("send_join_party_from_template name={!r}".format(name))
        self.agent.adm_log(type="party", text="send_join_party_from_template name={!r}".format(name))
        self.set_party(name=name)

    @public_method
    def set_party(self, name=None, description=u'', exp_share_type=False):
        # todo: review
        assert name is None or isinstance(name, unicode)
        assert description is None or isinstance(description, unicode)
        assert exp_share_type is None or isinstance(exp_share_type, bool)
        self.agent.log.info("set_party name={!r}".format(name))
        self.agent.adm_log(type="party", text="set_party name={!r}".format(name))
        SetPartyEvent(agent=self.agent, name=name, description=description, exp_share_type=exp_share_type,
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
    def change_party_share_option(self, share_exp):
        if not self.agent.party:
            return
        self.agent.log.info("change_party_share_option party={}".format(self.agent.party))
        self.agent.adm_log(type="party", text="change_party_share_option party={}".format(self.agent.party))
        self.agent.party.change_share_option(time=self.agent.server.get_time(), share_exp=share_exp, agent=self.agent)

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
        log.debug('Agent %r cmd: %r', self.agent._login, cmd)
        self.agent.log.info('Agent {} cmd: {!r}'.format(self.agent._login, cmd))
        try:
            self.console.on_cmd(cmd.lstrip('/'))
        except Exception as e:
            # log.warning('Agent {} try cmd: {!r} and generate exception {}'.format(self.agent._login, cmd, e.__class__.__name__))
            log.warning('Agent {} try cmd: {!r} and generate exception'.format(self.agent._login, cmd))

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

    @call_constrains(2)
    @basic_mode
    @public_method
    def enter_to_location(self, location_id):
        self.agent.log.info('enter to location[%s]', location_id)
        EnterToMapLocation(agent=self.agent, obj_id=location_id, time=self.agent.server.get_time()).post()

    @call_constrains(3)
    @basic_mode
    @public_method
    def exit_from_location(self):
        self.agent.log.info('exit from location')
        ExitFromMapLocation(agent=self.agent, time=self.agent.server.get_time()).post()

    @basic_mode
    @public_method
    def enter_to_npc(self, npc_node_hash):
        self.agent.log.info('enter to npc %s', npc_node_hash)
        # todo: resolve NPC by node_hash ##quest
        EnterToNPCEvent(agent=self.agent, npc=npc_node_hash, time=self.agent.server.get_time()).post()

    @basic_mode
    @public_method
    def enter_to_building(self, head_node_hash, build_name):
        self.agent.log.info('enter to build [%s] with head: %s', build_name, head_node_hash)

    @basic_mode
    @public_method
    def exit_from_npc(self, npc_node_hash):
        self.agent.log.info('exit from npc %s', npc_node_hash)

    @basic_mode
    @public_method
    def exit_from_building(self, head_node_hash, build_name):
        self.agent.log.info('exit from build [%s] with head: %s', build_name, head_node_hash)

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

    @public_method
    def insurance_buy(self, insurance_node_hash):
        TransactionBuyInsurance(time=self.agent.server.get_time(),
                                agent=self.agent,
                                insurance_node_hash=insurance_node_hash).post()

    @call_constrains(3)
    @basic_mode
    @public_method
    def fuel_station_active(self, fuel, tank_list, npc_node_hash):
        # log.info('agent %s want active fuel station, with value=%s  and tl = %s', self.agent, fuel, tank_list)
        TransactionGasStation(time=self.agent.server.get_time(), agent=self.agent, fuel=fuel,
                              tank_list=tank_list, npc_node_hash=npc_node_hash).post()

    @public_method
    def get_loot(self, poi_id):
        # log.info('agent %r want loot =%r', self.agent, poi_id)
        self.agent.log.info('get_loot poi_id={}'.format(poi_id))
        LootPickEvent(time=self.agent.server.get_time(), agent=self.agent, poi_stash_id=poi_id).post()

    # Ангар
    @call_constrains(3)
    @basic_mode
    @public_method
    def sell_car_in_hangar(self, npc_node_hash):
        self.agent.log.info('agent %r sell car', self.agent)
        TransactionHangarSell(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash).post()

    @call_constrains(5)
    @basic_mode
    @public_method
    def buy_car_in_hangar(self, npc_node_hash, car_uid):
        _car_uid = None if car_uid is None else UUID(car_uid)
        self.agent.log.info('agent %r want buy car, with uid=%r', self.agent, _car_uid)
        TransactionHangarBuy(time=self.agent.server.get_time(), agent=self.agent, car_uid=_car_uid, npc_node_hash=npc_node_hash).post()

    @basic_mode
    @public_method
    def get_hangar_info(self, npc_node_hash):
        messages.HangarInfoMessage(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash).post()

    # Стоянка

    @call_constrains(3)
    @basic_mode
    @public_method
    def parking_leave_car(self, npc_node_hash):
        self.agent.log.info('agent %r sell car', self.agent)
        TransactionParkingLeave(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash).post()

    @call_constrains(5)
    @basic_mode
    @public_method
    def parking_select_car(self, car_number, npc_node_hash):
        self.agent.log.info('agent %r want buy car, with number=%r', self.agent, car_number)
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

    @call_constrains(3)
    @basic_mode
    @public_method
    def armorer_apply(self, armorer_slots, npc_node_hash):
        TransactionArmorerApply(time=self.agent.server.get_time(), agent=self.agent, armorer_slots=armorer_slots,
                                npc_node_hash=npc_node_hash).post()

    # Механик

    @call_constrains(3)
    @basic_mode
    @public_method
    def mechanic_apply(self, mechanic_slots, npc_node_hash):
        TransactionMechanicApply(time=self.agent.server.get_time(), agent=self.agent, mechanic_slots=mechanic_slots,
                                 npc_node_hash=npc_node_hash).post()

    @call_constrains(3)
    @basic_mode
    @public_method
    def mechanic_repair_apply(self, hp, npc_node_hash):
        TransactionMechanicRepairApply(time=self.agent.server.get_time(), agent=self.agent, hp=hp,
                                 npc_node_hash=npc_node_hash).post()

    # Тюнер

    @call_constrains(3)
    @basic_mode
    @public_method
    def tuner_apply(self, tuner_slots, npc_node_hash):
        TransactionTunerApply(time=self.agent.server.get_time(), agent=self.agent, tuner_slots=tuner_slots,
                              npc_node_hash=npc_node_hash).post()

    @call_constrains(3)
    @basic_mode
    @public_method
    def tuner_cancel(self):
        pass

    # Торговец

    @basic_mode
    @public_method
    def get_trader_info(self, npc_node_hash):
        t = self.agent.server.get_time()
        messages.TraderInfoMessage(time=t, agent=self.agent, npc_node_hash=npc_node_hash).post()
        messages.TraderAgentAssortmentMessage(time=t, agent=self.agent, npc_node_hash=npc_node_hash).post()

    @call_constrains(3)
    @basic_mode
    @public_method
    def trader_apply(self, player_table, trader_table, npc_node_hash):
        TransactionTraderApply(time=self.agent.server.get_time(), agent=self.agent, player_table=player_table,
                               trader_table=trader_table, npc_node_hash=npc_node_hash).post()

    @call_constrains(3)
    @basic_mode
    @public_method
    def girl_apply(self, npc_node_hash, service_index):
        TransactionGirlApply(time=self.agent.server.get_time(), agent=self.agent, service_index=service_index,
                             npc_node_hash=npc_node_hash).post()

    # Бартер

    @public_method
    def init_barter(self, recipient_login):
        self.agent.log.info('init_barter recipient_login={!r}'.format(recipient_login))
        # log.debug('Agent %s invite %s to barter', self.agent, recipient_login)
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

    @call_constrains(3)
    @basic_mode
    @public_method
    def set_rpg_state(self, npc_node_hash, skills, buy_skills, perks):
        # log.debug('Agent %s try set rpg state', self.agent)
        TransactionSetRPGState(time=self.agent.server.get_time(), agent=self.agent, npc_node_hash=npc_node_hash,
                               skills=skills, buy_skills=buy_skills, perks=perks).post()

    @public_method
    def get_about_self(self):
        self.agent.log.info('get_about_self')
        messages.UserGetAboutSelf(agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def set_about_self(self, text):
        self.agent.log.info('set_about_self text={!r}'.format(text))
        self.agent.example.profile.about_self = text
        messages.UserGetAboutSelf(agent=self.agent, time=self.agent.server.get_time()).post()

    @call_constrains(1)
    @public_method
    def set_name_car(self, text):
        if len(text) > 30:
            self.agent.log.info('Try set name_car very long')
            return
        ex_car = self.agent.example.profile.car
        if ex_car and ex_car.name_car != text:
            self.agent.log.info('set_name_car text={!r}'.format(text))
            ex_car.name_car = text
            messages.UserExampleCarInfo(agent=self.agent, time=self.agent.server.get_time()).post()

    # Квесты
    @call_constrains(2)
    @public_method
    def quest_note_action(self, uid, result, **kw):
        self.agent.log.info('quest_note_action uid={} result={}'.format(uid, result))
        # log.info('Agent[%s] Quest Note <%s> Action: %s', self.agent, uid, result)
        # todo: найти ноту с этим ID и вызвать какую-то реакцию
        uid = UUID(uid)

        note = self.agent.example.profile.get_note(uid)
        if not note:
            log.warning('Note #{} is not found'.format(uid))
            return

        server = self.agent.server

        for q in self.agent.example.profile.quests_active:
            OnNote(server=server, time=server.get_time(), quest=q, note_uid=uid, result=result, **kw).post()

    @call_constrains(3)
    @public_method
    def quest_activate(self, quest_uid):
        self.agent.log.info('quest_activate quest_uid={}'.format(quest_uid))
        self.agent.example.profile.start_quest(UUID(quest_uid), time=self.agent.server.get_time(), server=self.agent.server)
        # todo: данный эвент должен вызываться при смене состояния квеста
        for q in self.agent.example.profile.quests_active:
            server = self.agent.server
            OnQuestChange(server=server, quest=q, time=server.get_time() + 0.5, target_quest_uid=quest_uid).post()

    @call_constrains(3)
    @public_method
    def quest_cancel(self, quest_uid):
        self.agent.log.info('quest_cancel quest_uid={}'.format(quest_uid))
        quest = self.agent.example.profile.get_quest(uid=UUID(quest_uid))
        if quest:
            server = self.agent.server
            OnCancel(server=server, quest=quest, time=server.get_time()).post()
        else:
            self.agent.log.error('Try cancel unavailable quest quest_uid={}'.format(quest_uid))

    @call_constrains(2)
    @public_method
    def quest_active_notes_view(self, quest_uid, active):
        self.agent.log.info('quest_active_notes_view quest_uid={}'.format(quest_uid))
        quest = self.agent.example.profile.get_quest(uid=UUID(quest_uid))
        if quest:
            # todo: вызвать метод через эвент: создать эвент или использовать event_deco
            quest.active_notes_view_change(active=active, time=self.agent.server.get_time())
            # Event(server=server, time=server.get_time(), callback_after=quest.active_notes_view_change).post()
            # event_deco(quest.active_notes_view_change)(active, time=server.get_time())
        else:
            self.agent.log.error('Try quest_active_notes_view unavailable quest quest_uid={}'.format(quest_uid))

    # Запрос инфы о другом игроке

    @public_method
    def get_interaction_info(self, player_nick):
        self.agent.log.info('get_interaction_info player_nick={!r}'.format(player_nick))
        messages.InteractionInfoMessage(time=self.agent.server.get_time(),
                                        agent=self.agent,
                                        player_nick=player_nick).post()

    # Административные методы
    @access_level(4)
    @public_method
    def get_tiles_admin(self, tile_name, x, y):
        log.info('{} get_tiles_admin for: {} / {} : {}'.format(self.agent, tile_name, x, y))
        from sublayers_server.model.tile_archive import get_tiles_admin
        get_tiles_admin(long(x), long(y), tile_name=tile_name)
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
    @call_constrains(4)
    @basic_mode
    @public_method
    def get_strategy_mode_info_objects(self):
        StrategyModeInfoObjectsEvent(agent=self.agent, time=self.agent.server.get_time()).post()

    @access_level(2)
    @public_method
    def teleport(self, x, y):
        self.agent.log.info('teleport x={}, y={}'.format(x, y))
        p = Point(long(x), long(y))
        if self.agent.car and p:
            # self.agent.save(time=self.agent.server.get_time())
            ex_car = self.agent.car.example
            self.agent.car.displace(time=self.agent.server.get_time())

            def set_new_position(event):
                ex_car.position = p
                self.on_simple_update_agent_api(time=event.time + 0.1)

            Event(server=self.agent.server, time=self.agent.server.get_time() + 0.1, callback_after=set_new_position).post()

    @public_method
    def quick_play_again(self, car_index=0):
        self.agent.log.info('quick_play_again with index: %s', car_index)
        api = self
        if (options.mode != 'quick') or (self.agent.car is not None):
            # todo: зафиксировать факт жульничества
            log.warning('Lie!!!!')
            return
        self.agent.user.car_index = car_index
        self.agent.init_example_car()
        api.update_agent_api(time=api.agent.server.get_time())

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

    @basic_mode
    @public_method
    def go_to_respawn(self, town_node_hash=None):
        self.agent.log.info('go_to_respawn with index: %s', town_node_hash)
        t = self.agent.server.get_time()
        self.agent.example.profile.insurance.set_last_town(agent=self.agent.example, time=t, town_node_hash=town_node_hash)
        self.update_agent_api(time=t)

    @basic_mode
    @public_method
    def set_resolution_scale(self, resolution_scale='big'):
        self.agent.log.info('set_resolution_scale : %s', resolution_scale)
        resolution_scale = str(resolution_scale)
        if isinstance(resolution_scale, str):
            self.agent.resolution_scale = resolution_scale
        else:
            log.warning('{} try set no str resolution_scale: {}'.format(self.agent, resolution_scale))