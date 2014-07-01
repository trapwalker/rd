# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from agents import User, AI
from utils import NameGenerator
import units
from vectors import Point
from api_tools import API, public_method


def gen_uid():
    pass  # todo: implementation


class AgentAPI(API):
    def __init__(self, agent, position=None, position_sigma=Point(0, 0)):
        super(AgentAPI, self).__init__()
        self.agent = agent
        if self.agent.cars:
            self.car = self.agent.cars[0]
        else:
            self.car = units.Bot(
                server=agent.server,
                position=Point.random_gauss(position or Point(0, 0), position_sigma),
                observing_range=1000,
            )
            self.agent.append_car(self.car)

    @public_method
    def goto(self, x, y):
        self.car.goto(Point(x, y))

    @public_method
    def stop(self):
        self.car.stop()

    @public_method
    def fire(self):
        pass  # todo: AgentAPI.fire implementation

    @public_method
    def set_speed(self, new_speed):
        pass  # todo: AgentAPI.set_speed implementation

    @public_method
    def chat_message(self, text):
        pass  # todo: AgentAPI.chat_message implementation


class ServerAPI(API):
    def __init__(self, server):
        self.server = server

    @public_method
    def get_agent(self, agent_id=None, make=False, ai=False):
        agent_id = agent_id or NameGenerator.new()['login']
        agent = self.server.agents.get(agent_id, None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            cls = AI if ai else User
            agent = cls(server=self.server, login=agent_id)
        return agent
