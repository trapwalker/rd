# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import User
from bson.objectid import ObjectId
from sublayers_server.model.api_tools import API


class ServerAPI(API):
    def __init__(self, server):
        """
        @type server: sublayers_server.model.event_machine.LocalServer
        """
        self.server = server

    def get_agent(self, user, make=False, do_disconnect=False):
        """
        @rtype sublayers_server.model.agents.Agent
        """
        agent = self.server.agents.get(str(user._id), None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            agent_exemplar = self.server.reg_agents.get([str(user._id)])  # todo: fix it
            if agent_exemplar is None:
                agent_exemplar = self.server.reg['/agents/user'].instantiate(
                    storage=self.server.reg_agents, name=str(user._id), login=user.name,
                )
            log.debug('Use agent exemplar: %r', agent_exemplar)

            # todo: Создавать агента на основе экземпляра
            # todo: rename User to UserAgent
            agent = User(
                server=self.server,
                user=user,
                time=self.server.get_time(),
                example=agent_exemplar,
            )
            log.info('Server API: New Agent is created: %r', agent)  # todo: fix text
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            # log.info('Server API: Old Agent given: %s', agent_id)
        return agent
