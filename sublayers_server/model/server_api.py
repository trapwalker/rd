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

    def get_agent(self, agent_id=None, make=False, do_disconnect=False):
        """
        @rtype sublayers_server.model.agents.Agent
        """
        db_res = self.server.app.auth_db.profiles.find({'_id': ObjectId(agent_id)})
        if db_res.count() == 0:
            return None
        login = db_res[0]['name']
        agent = self.server.agents.get(login, None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            agent_exemplar = self.server.reg_agents.get([login])  # todo: fix it
            if agent_exemplar is None:
                agent_exemplar = self.server.reg['/agents/user'].instantiate(
                    storage=self.server.reg_agents, name=login, login=login,
                )
            log.debug('Use agent exemplar: %r', agent_exemplar)

            # todo: Создавать агента на основе экземпляра
            agent = User(
                server=self.server,
                login=agent_exemplar.login,
                time=self.server.get_time(),
                example=agent_exemplar,
            )
            log.info('Server API: New Agent is created: %s', agent_id)  # todo: fix text
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            log.info('Server API: Old Agent given: %s', agent_id)
        return agent
