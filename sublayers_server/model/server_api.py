# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import User, AI
from sublayers_server.model.utils import NameGenerator
from sublayers_server.model.api_tools import API, public_method


class ServerAPI(API):
    def __init__(self, server):
        """
        @type server: sublayers_server.model.event_machine.Server
        """
        self.server = server

    def get_agent(self, agent_id=None, make=False, do_disconnect=False, ai=False):
        """
        @rtype sublayers_server.model.agents.Agent
        """
        agent_id = agent_id or NameGenerator.new(test=True)['login']
        agent = self.server.agents.get(agent_id, None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            cls = AI if ai else User
            agent = cls(server=self.server, login=agent_id, party=None, time=self.server.get_time())
            log.info('Server API: New Agent is created: %s', agent_id)
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            log.info('Server API: Old Agent given: %s', agent_id)
        return agent
