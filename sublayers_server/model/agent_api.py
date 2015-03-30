# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
from math import pi

log = logging.getLogger(__name__)

from sublayers_server.model import units
from sublayers_server.model import messages
from sublayers_server.model.vectors import Point
from sublayers_server.model.api_tools import API, public_method
from sublayers_server.model.rocket import Rocket
from sublayers_server.model.console import Shell
from sublayers_server.model.party import Party
from sublayers_server.model.events import Event


class UpdateAgentAPIEvent(Event):
    def __init__(self, api, **kw):
        super(UpdateAgentAPIEvent, self).__init__(server=api.agent.server, **kw)
        self.api = api

    def on_perform(self):
        super(UpdateAgentAPIEvent, self).on_perform()
        self.api.on_update_agent_api()


class OpenTemplateWindowMessage(messages.Message):
    def __init__(self, url, unique=False, win_name=None, page_type=None, **kw):
        super(OpenTemplateWindowMessage, self).__init__(**kw)
        self.url = url
        self.unique = unique
        self.win_name = win_name
        self.page_type = page_type

    def as_dict(self):
        d = super(OpenTemplateWindowMessage, self).as_dict()
        d.update(
            url=self.url,
            unique=self.unique,
            win_name=self.win_name,
            page_type=self.page_type
        )
        return d


class CloseTemplateWindowMessage(messages.Message):
    def __init__(self, unique=False, win_name=None, **kw):
        super(CloseTemplateWindowMessage, self).__init__(**kw)
        self.unique = unique
        self.win_name = win_name

    def as_dict(self):
        d = super(CloseTemplateWindowMessage, self).as_dict()
        d.update(
            unique=self.unique,
            win_name=self.win_name,
        )
        return d


class AgentAPI(API):
    # todo: do not make instance of API for all agents
    def __init__(self, agent):
        super(AgentAPI, self).__init__()
        self.agent = agent
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

    def send_init_package(self):
        messages.Init(agent=self.agent, time=None).post()
        # todo: если машинка не новая, то отправитьв полное состояние (перезарядки и тд)

        # эффекты
        for effect in self.car.effects:
            effect.send_message()

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
                is_first=True,
                is_boundary=False
            ).post()

        # отобразить информацию о стрельбе по нашей машинке и нашей машинки
        self.car.send_auto_fire_messages(agent=self.agent, action=True)

        # для каждого VO узнать информацию о стрельбе
        for vo in vo_list:
            if vo.hp_state:
                vo.send_auto_fire_messages(agent=self.agent, action=True)

    def update_agent_api(self):
        UpdateAgentAPIEvent(api=self).post()

    def on_update_agent_api(self):
        if self.agent.cars:
            self.car = self.agent.cars[0]
        else:
            self.make_car()

        assert self.car.hp > 0, 'Car HP <= 0'

        # todo: deprecated  (НЕ ПОНЯТНО ЗАЧЕМ!)
        self.shell = Shell(self.cmd_line_context(), dict(
            pi=pi,
            P=Point,
            log=log,
        ))

        self.send_init_package()

    def make_car(self, position=None, position_sigma=Point(100, 100)):
        self.car = self.agent.server.randomCarList.get_random_car(agent=self.agent)
        self.agent.append_car(self.car)

    @public_method
    def open_window_create_party(self):
        OpenTemplateWindowMessage(
            agent=self.agent,
            url='/party',
            unique=True,
            win_name='create_party',
            page_type='create',
        ).post()

    @public_method
    def send_create_party_from_template(self, name, description):
        self.set_party(name=name, description=description)
        CloseTemplateWindowMessage(
            agent=self.agent,
            unique=True,
            win_name="create_party"
        ).post()

    @public_method
    def send_join_party_from_template(self, name):
        self.set_party(name=name)

    @public_method
    def set_party(self, name=None, id=None, description=''):
        """
        Create party or accept invitation
        @param basestring|None name: new or existed name of party
        @param str|int id: existed id of party
        """
        log.info('%s try to set or create party %s', self.agent.login, name)
        if name is None:
            if self.agent.party:
                self.agent.party.exclude(self.agent)
        else:
            party = Party.search(name)
            if party is None:
                party = Party(owner=self.agent, name=name, description=description)
            elif self.agent not in party:
                party.include(self.agent)

    @public_method
    def send_invite(self, username):
        #todo: проблемы с русским языком
        #log.info('%s invite %s to party %s', self.agent.login, username, self.agent.party)
        user = self.agent.server.agents.get(username)
        if user is None:
            messages.PartyErrorMessage(agent=self.agent, comment='Unknown recipient').post()
            return
        party = self.agent.party
        if party is None:
            party = Party(owner=self.agent)
        party.invite(sender=self.agent, recipient=user)

    @public_method
    def send_kick(self, username):
        #todo: проблемы с русским языком
        #log.info('%s invite %s to party %s', self.agent.login, username, self.agent.party)
        party = self.agent.party
        if party is None:
            messages.PartyErrorMessage(agent=self.agent, comment='Invalid party').post()
            return
        user = self.agent.server.agents.get(username)
        if (user is None) or (not (user in party)):
            messages.PartyErrorMessage(agent=self.agent, comment='Unknown agent for kick').post()
            return
        party.kick(kicker=self.agent, kicked=user)

    @public_method
    def send_set_category(self, username, category):
        #todo: проблемы с русским языком
        #log.info('%s invite %s to party %s', self.agent.login, username, self.agent.party)
        party = self.agent.party
        if party is None:
            messages.PartyErrorMessage(agent=self.agent, comment='Invalid party').post()
            return
        if not (party.owner is self.agent):
            messages.PartyErrorMessage(agent=self.agent, comment='You dont have rights').post()
            return
        user = self.agent.server.agents.get(username)
        if (user is None) or (not (user in party)):
            messages.PartyErrorMessage(agent=self.agent, comment='Unknown agent for set category').post()
            return
        party.get_member_by_agent(agent=user).set_category(category=category)

    @public_method
    def change_car(self):
        self.agent.drop_car(self.car)
        self.make_car()
        self.send_init_package()

    @public_method
    def fire_discharge(self, side):
        if self.car.limbo:
            return
        self.car.fire_discharge(side=side)

    @public_method
    def fire_auto_enable(self, side, enable):
        if self.car.limbo:
            return
        self.car.fire_auto_enable(side=side, enable=enable)

    @public_method
    def crazy(self, target_id=None):
        # todo: identify target by name too
        from sublayers_server.model.task_tools import CrazyTask
        CrazyTask(owner=self.car, target_id=target_id).start()

    @public_method
    def chat_message(self, text):
        log.info('Agent %s say: %r', self.agent.login, text)
        app = self.agent.connection.application
        me = self.agent
        chat = app.chat
        msg_id = len(chat)  # todo: get "client_id" from client message info

        message_params = dict(author=me, text=text, client_id=msg_id)
        for client_connection in app.clients:
            messages.Chat(agent=client_connection.agent, **message_params).post()

        chat.append(message_params)

    @public_method
    def send_rocket(self):
        if self.car.limbo:
            return
        # todo: ракета должна создаваться в unit
        # Rocket(starter=self.car, server=self.agent.server)

    @public_method
    def set_motion(self, x, y, cc, turn, comment=None):
        if self.car.limbo:
            return
        p = None
        if x and y:
            p = Point(x, y)
        self.car.set_motion(position=p, cc=cc, turn=turn, comment=comment)


    @public_method
    def console_cmd(self, cmd):
        log.debug('Agent %s cmd: %r', self.agent.login, cmd)
        cmd = cmd.strip()
        assert cmd, 'console command is empty or False: {!r}'.format(cmd)
        words = cmd.split()
        command, args = words[0], words[1:]

        # todo: need refactoring
        if command == 'crazy':
            target = args[0] if args else None
            if isinstance(target, (basestring)) and target.isdigit():
                target = int(target)
            self.crazy(target)
        elif command == 'sepuku':
            self.change_car()  # todo: починить смену машинки
        elif command == '/create':
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
        elif command == '/go':
            self.go_test1()
        else:
            log.warning('Unknown console command "%s"', cmd)

    @public_method
    def delete_invite(self, invite_id):
        self.agent.delete_invite(invite_id)