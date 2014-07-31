# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from agents import User, AI
from utils import NameGenerator
from api_tools import API, public_method


class ServerAPI(API):
    def __init__(self, server):
        self.server = server

    def get_agent(self, agent_id=None, make=False, ai=False):
        """
        @rtype sublayers_server.model.agents.Agent
        """
        agent_id = agent_id or NameGenerator.new()['login']
        agent = self.server.agents.get(agent_id, None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            cls = AI if ai else User
            agent = cls(server=self.server, login=agent_id)
        return agent
