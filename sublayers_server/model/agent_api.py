# -*- coding: utf-8 -*-

import logging
from math import pi

log = logging.getLogger(__name__)
log.__class__.__call__ = log.__class__.info

import units
from vectors import Point
from api_tools import API, public_method
import messages
#from weapons import SectoralWeapon
from rocket import Rocket
from console import Shell
import events

import random


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

        self.shell = Shell(self.cmd_line_context(), dict(
            pi=pi,
            P=Point,
            log=log,
        ))
        self.send_init_package()

    def cmd_line_context(self):
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
    def change_car(self):
        if self.car.limbo:
            return
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
        if self.car.limbo:
            return
        server = self.agent.server

        def crazy_func(event=None):
            log.debug('Run crazy func')
            dt = abs(random.gauss(0, 5)) + 0.5  # sec
            events.Event(server=server, time=server.get_time() + dt, callback_before=crazy_func, comment="I'm crazy").post()
            if self.agent.cars:
                p = None
                target = None
                car = self.agent.cars[0]

                if target_id:
                    target = server.objects.get(target_id)
                if not target and hasattr(server, 'mission_cargo'):
                    target = server.mission_cargo

                if target and hasattr(target, 'position'):
                    p = Point.random_gauss(target.position, Point(1000, 1000))

                p = p or Point.random_gauss(car.position, Point(1000, 1000))
                log.debug('%s crazy go to %s position', car, target or p)
                #self.car.goto(position=p, time=event.time if event else server.get_time())
                self.car.set_motion(position=p, cc=1.0)

        crazy_func()

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
    def console_cmd(self, cmd):
        if self.car.limbo:
            return
        log.info('Agent %s cmd: %r', self.agent.login, cmd)
        self.shell.run(cmd)

    @public_method
    def send_rocket(self):
        if self.car.limbo:
            return
        # todo: ракета должна создаваться в unit
        Rocket(starter=self.car, server=self.agent.server)

    @public_method
    def set_motion(self, x, y, cc, turn):
        if self.car.limbo:
            return
        p = None
        if x and y:
            p = Point(x, y)
        self.car.set_motion(position=p, cc=cc, turn=turn)


