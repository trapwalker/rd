# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import User, AI
from bson.objectid import ObjectId
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
        db_res = self.server.app.auth_db.profiles.find({'_id': ObjectId(agent_id)})
        login = db_res[0]['name']
        agent = self.server.agents.get(login, None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            cls = AI if ai else User
            agent = cls(server=self.server, login=login, party=None, time=self.server.get_time())
            log.info('Server API: New Agent is created: %s', agent_id)
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            log.info('Server API: Old Agent given: %s', agent_id)
        return agent
