# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
from math import pi

log = logging.getLogger(__name__)

from sublayers_server.model import messages
from sublayers_server.model.vectors import Point
from sublayers_server.model.api_tools import API, public_method
from sublayers_server.model.weapon_objects.rocket import RocketStartEvent
from sublayers_server.model.slave_objects.scout_droid import ScoutDroidStartEvent
from sublayers_server.model.slave_objects.stationary_turret import StationaryTurretStartEvent
from sublayers_server.model.party import Party
from sublayers_server.model.events import (
    Event, EnterToMapLocation, ReEnterToLocation, ExitFromMapLocation, ShowInventoryEvent,
    HideInventoryEvent, ItemActionInventoryEvent, ItemActivationEvent, LootPickEvent, EnterToNPCEvent)
from sublayers_server.model.transaction_events import (
    TransactionGasStation, TransactionHangarChoice, TransactionParkingLeaveCar, TransactionParkingSelectCar,
    TransactionArmorerApply, TransactionMechanicApply, TransactionTunerApply, TransactionTraderApply,
    TransactionSkillApply, TransactionActivatePerk, TransactionResetSkills, TransactionResetPerks)
from sublayers_server.model.units import Unit, Bot
from sublayers_server.model.chat_room import (
    ChatRoom, ChatRoomMessageEvent, ChatRoomPrivateCreateEvent, ChatRoomPrivateCloseEvent, )
from sublayers_server.model.map_location import Town, GasStation
from sublayers_server.model.barter import InitBarterEvent, ActivateBarterEvent, LockBarterEvent, UnLockBarterEvent, \
    CancelBarterEvent, SetMoneyBarterEvent
from sublayers_server.model.barter import InviteBarterMessage

from sublayers_server.model.inventory import ItemState

# todo: Проверить допустимость значений входных параметров

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
    def __init__(self, agent, name=None, description='', **kw):
        super(SetPartyEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.name = name
        self.description = description

    def on_perform(self):
        super(SetPartyEvent, self).on_perform()
        log.info('%r try to set or create party %s', self.agent.login, self.name)
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
        # log.info('%r invite %s to party %r', self.agent.login, username, self.agent.party)
        user = self.agent.server.agents.get(self.username)
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
        # log.info('%r invite %s to party %r', self.agent.login, username, self.agent.party)
        party = self.agent.party
        if party is None:
            # todo: assert', warning'и -- ок. Зачем сообщения клиенту?
            messages.PartyErrorMessage(agent=self.agent, comment='Invalid party', time=self.time).post()
            return
        user = self.agent.server.agents.get(self.username)
        if user is None or user not in party:
            messages.PartyErrorMessage(agent=self.agent, comment='Unknown agent for kick', time=self.time).post()
            return
        party.kick(kicker=self.agent, kicked=user, time=self.time)


class SendSetCategoryEvent(Event):
    def __init__(self, agent, username, category, **kw):
        super(SendSetCategoryEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.username = username
        self.category = category

    def on_perform(self):
        super(SendSetCategoryEvent, self).on_perform()
        # todo: проблемы с русским языком
        # log.info('%r invite %r to party %s', self.agent.login, username, self.agent.party)
        party = self.agent.party
        if party is None:
            # todo: Зачем все эти сообщения клиенту?!
            messages.PartyErrorMessage(agent=self.agent, comment='Invalid party', time=self.time).post()
            return
        if party.owner is not self.agent:
            messages.PartyErrorMessage(agent=self.agent, comment='You do not have permission', time=self.time).post()
            return
        user = self.agent.server.agents.get(self.username)
        if user is None or user not in party:
            messages.PartyErrorMessage(agent=self.agent, comment='Unknown agent for set category',
                                       time=self.time).post()
            return
        party.get_member_by_agent(agent=user).category = self.category


class AgentAPI(API):
    # todo: do not make instance of API for all agents
    def __init__(self, agent):
        """
        @type agent: sublayers_server.model.agents.Agent
        """
        super(AgentAPI, self).__init__()
        self.agent = agent
        self.car = None
        agent.api = self
        self.update_agent_api()

    def cmd_line_context(self):
        # todo: deprecated
        ctx = dict(
            srv=self.agent.server,
            car=self.car,
        )
        for attr_name in dir(self):
            attr = getattr(self, attr_name)
            # todo: do not use protected methods outside
            if hasattr(attr, '_public_method') and attr._public_method:
                ctx[attr_name] = attr
        return ctx

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
                InviteBarterMessage(agent=self.agent, time=time, barter=barter).post()

    def update_agent_api(self, time=None):
        InitTimeEvent(time=self.agent.server.get_time(), agent=self.agent).post()
        UpdateAgentAPIEvent(api=self, time=time if time is not None else self.agent.server.get_time()).post()

        # For ReInit Time
        t0 = self.agent.server.get_time()
        for add_mul in xrange(1, 6):
            InitTimeEvent(time=t0 + add_mul * 5, agent=self.agent).post()

    def on_update_agent_api(self, time):
        messages.InitAgent(agent=self.agent, time=time).post()

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
        self.set_party(name=name, description=description)

    @public_method
    def send_join_party_from_template(self, name):
        self.set_party(name=name)

    @public_method
    def set_party(self, name=None, description=''):
        SetPartyEvent(agent=self.agent, name=name, description=description,
                      time=self.agent.server.get_time()).post()

    @public_method
    def send_invite(self, username):
        SendInviteEvent(agent=self.agent, username=username, time=self.agent.server.get_time()).post()

    @public_method
    def delete_invite(self, invite_id):
        DeleteInviteEvent(agent=self.agent, invite_id=invite_id, time=self.agent.server.get_time()).post()

    @public_method
    def send_kick(self, username):
        SendKickEvent(agent=self.agent, username=username, time=self.agent.server.get_time()).post()

    @public_method
    def send_set_category(self, username, category):
        SendSetCategoryEvent(agent=self.agent, username=username, category=category,
                             time=self.agent.server.get_time()).post()

    @public_method
    def fire_discharge(self, side):
        if self.car.limbo or not self.car.is_alive:
            return
        self.car.fire_discharge(side=side, time=self.agent.server.get_time())

    @public_method
    def fire_auto_enable(self, enable):
        # log.debug('Car - %s, set auto fire - %s', self.car, enable)
        if self.car.limbo or not self.car.is_alive:
            return
        self.car.fire_auto_enable(enable=enable, time=self.agent.server.get_time())

    @public_method
    def chat_message(self, room_name, msg):
        ChatRoomMessageEvent(room_name=room_name, agent=self.agent, msg=msg,
                             time=self.agent.server.get_time()).post()

    @public_method
    def send_rocket(self):
        if self.car.limbo or not self.car.is_alive:
            return
            # RocketStartEvent(starter=self.car, time=self.agent.server.get_time()).post()

    @public_method
    def send_slow_mine(self):
        if self.car.limbo or not self.car.is_alive:
            return
            # SlowMineStartEvent(starter=self.car, time=self.agent.server.get_time()).post()

    @public_method
    def send_stationary_turret(self):
        if self.car.limbo or not self.car.is_alive:
            return
            # StationaryTurretStartEvent(starter=self.car, time=self.agent.server.get_time()).post()

    @public_method
    def send_scout_droid(self, x, y):
        if self.car.limbo or not self.car.is_alive:
            return
        assert x and y
        p = Point(x, y)
        # ScoutDroidStartEvent(starter=self.car, target=p, time=self.agent.server.get_time()).post()

    @public_method
    def set_motion(self, x, y, cc, turn, comment=None):
        if self.car.limbo or not self.car.is_alive:
            return
        p = None
        if x and y:
            p = Point(x, y)
        self.car.set_motion(target_point=p, cc=cc, turn=turn, comment=comment, time=self.agent.server.get_time())

    @public_method
    def delete_car(self):
        if self.car.limbo or not self.car.is_alive:
            return
        self.car.delete(time=self.agent.server.get_time())

    @public_method
    def console_cmd(self, cmd):
        log.debug('Agent %r cmd: %r', self.agent.login, cmd)
        cmd = cmd.strip()
        assert cmd, 'console command is empty or False: {!r}'.format(cmd)
        words = cmd.split()
        command, args = words[0], words[1:]

        # todo: need refactoring
        if command == '/create':
            # todo: options of party create
            self.set_party(name=args[0] if args else None)
        elif command == '/leave':
            self.set_party()
        elif command == '/invite':
            for name in args:
                self.send_invite(username=name)
        elif command == '/die':
            self.agent.die()
        elif command == '/damage':
            self.agent.hit(int(args[0]) if args else 0)
        elif command == '/kick':
            for name in args:
                self.send_kick(username=name)
        # todo: отправку метрик необходимо сделать через евент (потому что мессаджи должны проходить через евент!)
        # elif command == '/metric':
        # metric_name = args[0] if args else None
        #    if metric_name:
        #        if hasattr(self.car.stat_log, metric_name):
        #            if metric_name == 'frag':
        #                m_car = self.car.stat_log.get_metric('frag')
        #                m_agent = self.agent.stat_log.get_metric('frag')
        #                messages.Message(agent=self.agent, comment='{} / {}'.format(m_car, m_agent)).post()
        #            else:
        #                messages.Message(agent=self.agent, comment=self.car.stat_log.get_metric(metric_name)).post()
        #        elif metric_name == 'server':
        #            messages.Message(agent=self.agent, comment=self.agent.server.get_server_stat()).post()
        elif command == '/delete':
            self.delete_car()
        elif command == '/init':
            self.update_agent_api()
        elif command == '/money':
            if args:
                add_money = int(args[0])
                self.agent.example.balance += add_money
        elif command == '/exp':
            if args:
                add_exp = int(args[0])
                self.agent.stat_log.exp(time=self.agent.server.get_time(), delta=add_exp)
        elif command == '/param':
            if args and self.agent.car:
                param_name = args[0]
                agent = self.agent
                log.debug('Agent %s  have param %s = %s', agent, param_name,
                          agent.car.example.get_modify_value(param_name=param_name, example_agent=agent.example))
        elif command == '/save':
            self.agent.server.save()
        elif command == '/reset':
            if args:
                all_agents = self.agent.server.agents
                agents = all_agents if '*' in args else filter(None, (all_agents.get(username) for username in args))
                for agent_to_reset in agents:
                    agent_to_reset.example.reset()
                    self.send_kick(username=agent_to_reset.login)
            else:
                self.send_kick(username=self.agent.login)
                self.agent.example.reset()
        elif command == '/quest':
            if not args:
                pass  # todo: Вывести перечень активных квестов
            elif args[0] == 'get':
                for q in args[1:]:
                    try:
                        q = self.agent.server.reg[q]
                    except:
                        log.error('Quest %s is not found', q)
                        raise
                    log.debug('Abstract quest %s selected', q)
                    quest = q.instantiate()
                    log.debug('Quest %s instantiated', quest)
                    quest.start(agents=self.agent, time=self.agent.server.get_time())  # todo: store quest to agent or global storage
                    log.debug('Quest %s started', quest)
        elif command == '/qi':
            for k, q in self.agent.quests.items():
                log.info('QUEST: {}:: {}'.format(k, q))

        else:
            log.warning('Unknown console command "%s"', cmd)

    @public_method
    def create_private_chat(self, recipient):
        # log.info('agent %s try create private room with %s', self.agent, recipient)
        ChatRoomPrivateCreateEvent(agent=self.agent, recipient_login=recipient,
                                   time=self.agent.server.get_time()).post()

    @public_method
    def close_private_chat(self, name):
        # log.info('agent %s try close private chat %s', self.agent, name)
        ChatRoomPrivateCloseEvent(agent=self.agent, chat_name=name, time=self.agent.server.get_time()).post()

    @public_method
    def enter_to_location(self, location_id):
        # log.info('agent %s want enter to location is %s', self.agent, town_id)
        EnterToMapLocation(agent=self.agent, obj_id=location_id, time=self.agent.server.get_time()).post()

    @public_method
    def exit_from_location(self, location_id):
        # log.info('agent %s want exit from location is %s', self.agent, town_id)
        ExitFromMapLocation(agent=self.agent, obj_id=location_id, time=self.agent.server.get_time()).post()

    @public_method
    def enter_to_npc(self, npc_type):
        # log.info('agent %s want enter to npc %s', self.agent, npc_type)
        EnterToNPCEvent(agent=self.agent, npc_type=npc_type, time=self.agent.server.get_time()).post()

    @public_method
    def show_inventory(self, owner_id):
        # log.info('agent %s want show inventory from %s', self.agent, owner_id)
        ShowInventoryEvent(agent=self.agent, owner_id=owner_id, time=self.agent.server.get_time()).post()

    @public_method
    def hide_inventory(self, owner_id):
        # log.info('agent %s want hide inventory from %s', self.agent, owner_id)
        HideInventoryEvent(agent=self.agent, owner_id=owner_id, time=self.agent.server.get_time()).post()

    @public_method
    def item_action_inventory(self, start_owner_id=None, start_pos=None, end_owner_id=None, end_pos=None):
        ItemActionInventoryEvent(agent=self.agent, start_owner_id=start_owner_id, start_pos=start_pos,
                                 end_owner_id=end_owner_id, end_pos=end_pos, time=self.agent.server.get_time()).post()

    @public_method
    def get_balance_cls(self, balance_cls_name):
        pass
        # log.info('agent %s want get balance_cls_name %s', self.agent, balance_cls_name)
        # messages.BalanceClsInfo(agent=self.agent, time=self.agent.server.get_time(),
        # balance_cls_name=balance_cls_name).post()

    @public_method
    def activate_item(self, owner_id, position, target_id):
        log.info('agent %s want activate item in position %s for target_id %s', self.agent, position, target_id)
        ItemActivationEvent(agent=self.agent, owner_id=owner_id, position=position, target_id=target_id,
                            time=self.agent.server.get_time()).post()

    @public_method
    def fuel_station_active(self, fuel, tank_list):
        # log.info('agent %s want active fuel station, with value=%s  and tl = %s', self.agent, fuel, tank_list)
        TransactionGasStation(time=self.agent.server.get_time(), agent=self.agent, fuel=fuel,
                              tank_list=tank_list).post()

    @public_method
    def get_loot(self, poi_id):
        log.info('agent %r want loot =%r', self.agent, poi_id)
        LootPickEvent(time=self.agent.server.get_time(), agent=self.agent, poi_stash_id=poi_id).post()

    # Ангар

    @public_method
    def choice_car_in_hangar(self, car_number):
        log.info('agent %r want choice car, with number=%r', self.agent, car_number)
        TransactionHangarChoice(time=self.agent.server.get_time(), agent=self.agent, car_number=car_number).post()

    # Стоянка

    @public_method
    def parking_select_car(self, car_number):
        # log.info('agent %r want get car from parking, with number=%r', self.agent, car_number)
        TransactionParkingSelectCar(time=self.agent.server.get_time(), agent=self.agent, car_number=car_number).post()

    @public_method
    def parking_leave_car(self):
        # log.info('agent %r want leave car in parking', self.agent)
        TransactionParkingLeaveCar(time=self.agent.server.get_time(), agent=self.agent).post()

    # Оружейник

    @public_method
    def armorer_apply(self, armorer_slots):
        TransactionArmorerApply(time=self.agent.server.get_time(), agent=self.agent, armorer_slots=armorer_slots).post()

    @public_method
    def armorer_cancel(self):
        messages.ExamplesShowMessage(agent=self.agent, time=self.agent.server.get_time()).post()

    # Механик

    @public_method
    def mechanic_apply(self, mechanic_slots):
        TransactionMechanicApply(time=self.agent.server.get_time(), agent=self.agent, mechanic_slots=mechanic_slots)\
            .post()

    @public_method
    def mechanic_cancel(self):
        messages.ExamplesShowMessage(agent=self.agent, time=self.agent.server.get_time()).post()

    # Тюнер

    @public_method
    def tuner_apply(self, tuner_slots):
        TransactionTunerApply(time=self.agent.server.get_time(), agent=self.agent, tuner_slots=tuner_slots).post()

    @public_method
    def tuner_cancel(self):
        messages.ExamplesShowMessage(agent=self.agent, time=self.agent.server.get_time()).post()

    # Торговец

    @public_method
    def trader_apply(self, player_table, trader_table):
        TransactionTraderApply(time=self.agent.server.get_time(), agent=self.agent, player_table=player_table,
                               trader_table=trader_table).post()

    @public_method
    def trader_cancel(self):
        messages.ExamplesShowMessage(agent=self.agent, time=self.agent.server.get_time()).post()
        messages.SetupTraderReplica(agent=self.agent, time=self.agent.server.get_time(),
                                    replica=u'Ну как хочешь...').post()

    # Бартер

    @public_method
    def init_barter(self, recipient_login):
        # log.debug('Agent %s invite %s to barter', self.agent, recipient_login)
        InitBarterEvent(initiator=self.agent, recipient_login=recipient_login,
                        time=self.agent.server.get_time()).post()

    @public_method
    def activate_barter(self, barter_id):
        #log.debug('Agent %s accept barter_id %s ', self.agent, barter_id)
        ActivateBarterEvent(barter_id=barter_id, recipient=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def lock_barter(self, barter_id):
        #log.debug('Agent %s lock barter_id %s ', self.agent, barter_id)
        LockBarterEvent(barter_id=barter_id, agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def unlock_barter(self, barter_id):
        #log.debug('Agent %s unlock barter_id %s ', self.agent, barter_id)
        UnLockBarterEvent(barter_id=barter_id, agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def cancel_barter(self, barter_id):
        #log.debug('Agent %s cancel barter_id %s ', self.agent, barter_id)
        CancelBarterEvent(barter_id=barter_id, agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def table_money_barter(self, barter_id, money):
        #log.debug('Agent %s, for barter_id %s set money %s', self.agent, barter_id, money)
        SetMoneyBarterEvent(barter_id=barter_id, agent=self.agent, money=money,
                            time=self.agent.server.get_time()).post()

    # RPG

    @public_method
    def get_rpg_info(self):
        messages.RPGStateMessage(agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def reset_skills(self):
        TransactionResetSkills(agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def reset_perks(self):
        TransactionResetPerks(agent=self.agent, time=self.agent.server.get_time()).post()

    @public_method
    def set_skill_state(self, driving, shooting, masking, leading, trading, engineering):
        # log.debug('Agent %s try set skill state', self.agent)
        TransactionSkillApply(time=self.agent.server.get_time(), agent=self.agent, driving=driving, shooting=shooting,
                              masking=masking, leading=leading, trading=trading, engineering=engineering).post()

    @public_method
    def activate_perk(self, perk_id):
        # log.debug('Agent %s try aktivate perk %s', self.agent, perk_id)
        TransactionActivatePerk(time=self.agent.server.get_time(), agent=self.agent, perk_id=perk_id).post()

    @public_method
    def set_about_self(self, str):
        self.agent.example.about_self = str