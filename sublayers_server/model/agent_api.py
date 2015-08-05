# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
from math import pi

log = logging.getLogger(__name__)

from sublayers_server.model import messages
from sublayers_server.model.vectors import Point
from sublayers_server.model.api_tools import API, public_method
from sublayers_server.model.weapon_objects.rocket import RocketStartEvent
from sublayers_server.model.weapon_objects.effect_mine import SlowMineStartEvent
from sublayers_server.model.slave_objects.scout_droid import ScoutDroidStartEvent
from sublayers_server.model.slave_objects.stationary_turret import StationaryTurretStartEvent
from sublayers_server.model.console import Shell
from sublayers_server.model.party import Party
from sublayers_server.model.events import Event, EnterToMapLocation, ReEnterToLocation, ExitFromMapLocation, ShowInventoryEvent, \
    HideInventoryEvent, ItemActionInventoryEvent, ItemActivationEvent
from sublayers_server.model.units import Unit, Bot
from sublayers_server.model.chat_room import ChatRoom, ChatRoomMessageEvent, ChatRoomPrivateCreateEvent, \
    ChatRoomPrivateCloseEvent

from sublayers_server.model.inventory import ItemState


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
        log.info('%s try to set or create party %s', self.agent.login, self.name)
        if self.name is None:
            if self.agent.party:
                self.agent.party.exclude(self.agent, time=self.time)
        else:
            party = Party.search(self.name)
            if party is None:
                party = Party(time=self.time, owner=self.agent, name=self.name, description=self.description)
            elif self.agent not in party:
                party.include(self.agent, time=self.time)


class SendInviteEvent(Event):
    def __init__(self, agent, username, **kw):
        super(SendInviteEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.username = username

    def on_perform(self):
        super(SendInviteEvent, self).on_perform()
        #todo: проблемы с русским языком
        #log.info('%s invite %s to party %s', self.agent.login, username, self.agent.party)
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
        #todo: проблемы с русским языком
        #log.info('%s invite %s to party %s', self.agent.login, username, self.agent.party)
        party = self.agent.party
        if party is None:
            messages.PartyErrorMessage(agent=self.agent, comment='Invalid party', time=self.time).post()
            return
        user = self.agent.server.agents.get(self.username)
        if (user is None) or (not (user in party)):
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
        #todo: проблемы с русским языком
        #log.info('%s invite %s to party %s', self.agent.login, username, self.agent.party)
        party = self.agent.party
        if party is None:
            messages.PartyErrorMessage(agent=self.agent, comment='Invalid party', time=self.time).post()
            return
        if not (party.owner is self.agent):
            messages.PartyErrorMessage(agent=self.agent, comment='You do not have permission', time=self.time).post()
            return
        user = self.agent.server.agents.get(self.username)
        if (user is None) or (not (user in party)):
            messages.PartyErrorMessage(agent=self.agent, comment='Unknown agent for set category',
                                       time=self.time).post()
            return
        party.get_member_by_agent(agent=user).set_category(category=self.category)


class AgentAPI(API):
    # todo: do not make instance of API for all agents
    def __init__(self, agent):
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

    def send_init_package(self, time):
        messages.Init(agent=self.agent, time=time).post()
        # todo: если машинка не новая, то отправитьв полное состояние (перезарядки и тд)

        # эффекты
        #for effect in self.car.effects:
        #    effect.send_message()

        # сначала формируем список всех видимых объектов
        vo_list = []  # список отправленных машинок, чтобы не отправлять дважды от разных обсёрверов
        for obs in self.agent.observers:
            if not (obs in vo_list) and (obs != self.car):
                vo_list.append(obs)
            for vo in obs.visible_objects:
                if not (vo in vo_list)and (vo != self.car):
                    vo_list.append(vo)


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

    def update_agent_api(self, time=None):
        InitTimeEvent(time=self.agent.server.get_time(), agent=self.agent).post()
        UpdateAgentAPIEvent(api=self, time=time if time is not None else self.agent.server.get_time()).post()

    def on_update_agent_api(self, time):
        if self.agent.current_location is not None:
            ReEnterToLocation(agent=self.agent, location=self.agent.current_location, time=time).post()
            ChatRoom.resend_rooms_for_agent(agent=self.agent, time=time)
            return

        if self.agent.cars:
            self.car = self.agent.cars[0]
        else:
            self.make_car(time=time)
        assert self.car.hp(time=time) > 0, 'Car HP <= 0'

        # todo: deprecated  (НЕ ПОНЯТНО ЗАЧЕМ!)
        self.shell = Shell(self.cmd_line_context(), dict(
            pi=pi,
            P=Point,
            log=log,
        ))

        self.send_init_package(time=time)

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
        #log.debug('Car - %s, set auto fire - %s', self.car, enable)
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
        #RocketStartEvent(starter=self.car, time=self.agent.server.get_time()).post()

    @public_method
    def send_slow_mine(self):
        if self.car.limbo or not self.car.is_alive:
            return
        #SlowMineStartEvent(starter=self.car, time=self.agent.server.get_time()).post()

    @public_method
    def send_stationary_turret(self):
        if self.car.limbo or not self.car.is_alive:
            return
        #StationaryTurretStartEvent(starter=self.car, time=self.agent.server.get_time()).post()

    @public_method
    def send_scout_droid(self, x, y):
        if self.car.limbo or not self.car.is_alive:
            return
        assert x and y
        p = Point(x, y)
        #ScoutDroidStartEvent(starter=self.car, target=p, time=self.agent.server.get_time()).post()

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
        log.debug('Agent %s cmd: %r', self.agent.login, cmd)
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
        elif command == '/kick':
            for name in args:
                self.send_kick(username=name)
        # todo: отправку метрик необходимо сделать через евент (потому что мессаджи должны проходить через евент!)
        #elif command == '/metric':
        #    metric_name = args[0] if args else None
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
        elif command == '/fuel':
            car = self.car
            #ItemState(server=car.server, time=self.agent.server.get_time(), balance_cls='Tank10', max_count=1).\
            #    set_inventory(time=self.agent.server.get_time(), inventory=car.inventory)
        else:
            log.warning('Unknown console command "%s"', cmd)

    @public_method
    def create_private_chat(self, recipient):
        #log.info('agent %s try create private room with %s', self.agent, recipient)
        ChatRoomPrivateCreateEvent(agent=self.agent, recipient_login=recipient,
                                   time=self.agent.server.get_time()).post()

    @public_method
    def close_private_chat(self, name):
        #log.info('agent %s try close private chat %s', self.agent, name)
        ChatRoomPrivateCloseEvent(agent=self.agent, chat_name=name, time=self.agent.server.get_time()).post()

    @public_method
    def enter_to_location(self, location_id):
        #log.info('agent %s want enter to town is %s', self.agent, town_id)
        EnterToMapLocation(agent=self.agent, obj_id=location_id, time=self.agent.server.get_time()).post()

    @public_method
    def exit_from_location(self, location_id):
        #log.info('agent %s want exit from town is %s', self.agent, town_id)
        ExitFromMapLocation(agent=self.agent, obj_id=location_id, time=self.agent.server.get_time()).post()

    @public_method
    def show_inventory(self, owner_id):
        #log.info('agent %s want show inventory from %s', self.agent, owner_id)
        ShowInventoryEvent(agent=self.agent, owner_id=owner_id, time=self.agent.server.get_time()).post()

    @public_method
    def hide_inventory(self, owner_id):
        #log.info('agent %s want hide inventory from %s', self.agent, owner_id)
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
        #                         balance_cls_name=balance_cls_name).post()

    @public_method
    def activate_item(self, owner_id, position, target_id):
        log.info('agent %s want activate item in position %s for target_id %s', self.agent, position, target_id)
        ItemActivationEvent(agent=self.agent, owner_id=owner_id, position=position, target_id=target_id,
                            time=self.agent.server.get_time()).post()

    @public_method
    def fuel_station_active(self, fuel):
        log.info('agent %s want active fuel station, with value=%s', self.agent, fuel)
        self.agent.example.balance -= fuel
        cur_fuel = self.agent.example.car.fuel + fuel
        max_fuel = self.agent.example.car.max_fuel
        if cur_fuel <= max_fuel:
            self.agent.example.car.fuel = cur_fuel
        else:
            self.agent.example.car.fuel = max_fuel
        messages.GasStationUpdate(agent=self.agent, time=self.agent.server.get_time()).post()