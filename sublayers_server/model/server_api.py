# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import User
from bson.objectid import ObjectId
from sublayers_server.model.api_tools import API
from sublayers_server.model.vectors import Point


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
                if getattr(user, 'type', '') == 'quick_user':
                    log.info('QuickGameuser ws connect: %s    [car_index=%s]', user.name, user.car_index)
                    # Создание "быстрой" машинки
                    user.car_index = int(user.car_index)
                    if user.car_index < 0 or user.car_index >= len(self.server.quick_game_cars_proto):
                        log.warning('Unknown QuickGame car index %s', user.car_index)
                        user.car_index = 0
                    agent_exemplar.car = self.server.quick_game_cars_proto[user.car_index].instantiate()
                    agent_exemplar.car.position = Point.random_gauss(self.server.quick_game_start_pos, 100)
                    agent_exemplar.current_location = None
                    # todo: Не забыть на быструю машинку повесить пулемёты !

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
