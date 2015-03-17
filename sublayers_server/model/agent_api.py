# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
from math import pi

log = logging.getLogger(__name__)

import sublayers_server.model.units
from sublayers_server.model.vectors import Point
from sublayers_server.model.api_tools import API, public_method
from sublayers_server.model import messages
from sublayers_server.model.rocket import Rocket
from sublayers_server.model.console import Shell
from sublayers_server.model.party import Party


class AgentAPI(API):
    # todo: do not make instance of API for all agents
    def __init__(self, agent, position=None, position_sigma=Point(100, 100)):
        # todo: use init position or remove that params
        super(AgentAPI, self).__init__()
        self.agent = agent
        if self.agent.cars:
            self.car = self.agent.cars[0]
        else:
            self.make_car()
            # todo: move to event queue

        # todo: deprecated
        self.shell = Shell(self.cmd_line_context(), dict(
            pi=pi,
            P=Point,
            log=log,
        ))
        self.send_init_package()

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
        # todo: move to Init-event performing method (!)
        messages.Init(agent=self.agent, time=None).post()

    def make_car(self, position=None, position_sigma=Point(100, 100)):
        self.car = self.agent.party.init_car(
            agent=self.agent,
            override_params=dict(position=Point.random_gauss(position, position_sigma)) if position else None,
            default_params=dict(cls=units.Bot),
        )

    @public_method
    def set_party(self, name=None, id=None):
        """
        Create party or accept invitation
        @param basestring|None name: new or existed name of party
        @param str|int id: existed id of party
        """
        # todo: autogenerate party name
        log.info('%s try to set or create party %s', self.agent.login, name)
        party = Party.search_or_create(name)
        party.include(self.agent)
        # todo: События на добавление/исключение в/из пати

    @public_method
    def send_invite(self, username):
        log.info('%s invite %s to party %s', self.agent.login, username, self.agent.party)

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
    def set_motion(self, x, y, cc, turn):
        if self.car.limbo:
            return
        p = None
        if x and y:
            p = Point(x, y)
        self.car.set_motion(position=p, cc=cc, turn=turn)

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
        elif command == 'party':
            # todo: options of party create
            self.set_party(name=args[0] if args else None)
        elif command == 'invite':
            for name in args:
                self.send_invite(username=name)
        else:
            log.warning('Unknown console command "%s"', cmd)
