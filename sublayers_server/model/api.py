# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from agents import User, AI
from utils import NameGenerator
import units
from vectors import Point


def gen_uid():
    pass  # todo: implementation


class API(object):
    def __init__(self, server):
        self.server = server


class AgentAPI(API):
    def __init__(self, agent, position=None, position_sigma=Point(0, 0), **kw):
        super(AgentAPI, self).__init__(**kw)
        self.agent = agent
        if self.agent.cars:
            self.car = self.agent.cars[0]
        else:
            self.car = units.Bot(
                server=self,
                position=Point.random_gauss(position or Point(0, 0), position_sigma),
                observing_range=1000,
            )
            self.agent.append_car(self.car)

    def goto(self, position):
        self.car.goto(position)

    def car_stop(self):
        self.car.stop()



class ServerAPI(API):

    def new_agent(self, name):
        pass

    def get_agent(self, agent_id=None, make=False, ai=False):
        agent_id = agent_id or NameGenerator.new()['login']
        agent = self.server.agents.get(agent_id, None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            cls = AI if ai else User
            agent = cls(server=self.server, login=agent_id)
        return agent
