# -*- coding: utf-8 -*-

import logging
from math import pi

log = logging.getLogger(__name__)
log.__class__.__call__ = log.__class__.info

import units
from datetime import datetime
from vectors import Point
from api_tools import API, public_method
from utils import serialize
from messages import ChatMessage, InitMessage
import tasks
from weapons import SectoralWeapon
from console import Shell
import events


def make_push_package(events):
    events = [event.as_dict() for event in events]
    return dict(
        message_type='push',
        events=events,
    )


class AgentAPI(API):
    def __init__(self, agent, position=None, position_sigma=Point(100, 100)):
        super(AgentAPI, self).__init__()
        self.agent = agent
        if self.agent.cars:
            self.car = self.agent.cars[0]
        else:
            self.make_car()

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
            if hasattr(attr, '_public_method') and attr._public_method:
                ctx[attr_name] = attr
        return ctx

    def send_init_package(self):
        if self.agent.connection:
            self.agent.connection.write_message(serialize(make_push_package([InitMessage(agent=self.agent)])))

    def make_car(self, position=None, position_sigma=Point(100, 100)): 
        if self.agent.party.name == 'Band':
            pointForStart = Point(16800, 19000)
        else:
            pointForStart = Point(8170, 21200)
        self.car = units.Bot(
            server=self.agent.server,
            position=Point.random_gauss(position or pointForStart, position_sigma),
            #observing_range=1000,
            owner=self.agent,
            weapons=[
                SectoralWeapon(direction=0, sector_width=45, r=400),
                SectoralWeapon(direction=pi, sector_width=45, r=350),
                SectoralWeapon(direction=pi * 1.5, sector_width=60, r=300),
                SectoralWeapon(direction=pi/2, sector_width=60, r=300),
            ],
        )
        self.agent.append_car(self.car)

    @public_method
    def change_car(self):
        self.agent.drop_car(self.car)
        self.make_car()
        self.send_init_package()

    @public_method
    def goto(self, x, y):
        #path = tasks.goto(self.car, Point(x, y))
        #return dict(path=path)
        def f(event):
            tasks.goto(self.car, Point(x, y))
        events.Callback(server=self.agent.server, func=f).send()

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
    def set_speed(self, new_speed):
        car = self.car
        last_motion = None
        for task in reversed(car.task_list):
            if isinstance(task, tasks.Motion):
                last_motion= task
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
        chat = app.chat
        msg_id = len(chat)  # todo: get "client_id" from client message info
        msg = ChatMessage(author=self.agent, text=text, client_id=msg_id)
        chat.append(msg)

        push_data = serialize(make_push_package([msg]))

        for client_connection in app.clients:
            client_connection.write_message(push_data)

    @public_method
    def console_cmd(self, cmd):
        log.info('Agent %s cmd: %r', self.agent.login, cmd)
        self.shell.run(cmd)
