# -*- coding: utf-8 -*-

import logging
from math import pi

log = logging.getLogger(__name__)
log.__class__.__call__ = log.__class__.info

import units
from vectors import Point
from api_tools import API, public_method
import messages
import tasks
#from weapons import SectoralWeapon
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
        # todo: move to Init-event performing method
        agent = self.agent
        agent.server.post_message(messages.Init(agent=agent, time=None))

    def make_car(self, position=None, position_sigma=Point(100, 100)):
        self.car = self.agent.party.init_car(
            agent=self.agent,
            override_params=dict(position=Point.random_gauss(position, position_sigma)) if position else None,
            default_params=dict(cls=units.Bot),
        )

    @public_method
    def change_car(self):
        self.agent.drop_car(self.car)
        self.make_car()
        self.send_init_package()

    @public_method
    def goto(self, x, y):
        self.car.goto(Point(x, y))

    @public_method
    def stop(self):
        self.car.stop()

    @public_method
    def fire(self, weapon_num=None, hit_list=None):
        # todo: move to Unit class
        if weapon_num is None:
            for weapon in self.car.weapons:
                weapon.fire(hit_list)
        else:
            self.car.weapons[weapon_num].fire(hit_list)

    @public_method
    def crazy(self, target_id=None):
        server = self.agent.server

        def crazy_func(event=None):
            log.debug('Run crazy func')
            dt = abs(random.gauss(0, 5)) + 0.5  # sec
            events.Callback(server=server, time=server.get_time() + dt, func=crazy_func, comment="I'm crazy").send()
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
                tasks.goto(self.car, p)

        crazy_func()

    @public_method
    def set_speed(self, new_speed):
        assert new_speed > 0, 'Cruise control speed must be > 0'
        car = self.car
        last_motion = None
        for task in reversed(car.task_list):
            if isinstance(task, tasks.Motion):
                last_motion = task
                break

        last_motion = last_motion or isinstance(car.task, tasks.Motion) and car.task
        if last_motion:
            car.stop()
            car.max_velocity = new_speed  # todo: check value
            target_point = last_motion.path[-1]['b'] if last_motion.path else last_motion.target_point
            path = tasks.goto(owner=car, target_point=target_point)  # todo: target point in abstract Motion is absent
            return dict(path=path)
        else:
            car.max_velocity = new_speed  # todo: check value

    @public_method
    def chat_message(self, text):
        log.info('Agent %s say: %r', self.agent.login, text)
        app = self.agent.connection.application
        me = self.agent
        srv = me.server
        chat = app.chat
        msg_id = len(chat)  # todo: get "client_id" from client message info

        message_params = dict(author=me, text=text, client_id=msg_id)
        for client_connection in app.clients:
            srv.post_message(messages.Chat(agent=client_connection.agent, **message_params))

        chat.append(message_params)

    @public_method
    def console_cmd(self, cmd):
        log.info('Agent %s cmd: %r', self.agent.login, cmd)
        self.shell.run(cmd)
