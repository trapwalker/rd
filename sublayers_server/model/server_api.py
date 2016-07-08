# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import User, QuickUser
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
            log.debug('Use agent exemplar: %r', agent_exemplar)

            # todo: Создавать агента на основе экземпляра
            # todo: rename User to UserAgent
            # todo: Это неправильно, некрасиво, переделать как-то !

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

    def get_agent_quick_game(self, user, do_disconnect=False):
        # User здесь обязательно QuickUser
        assert user.is_quick_user
        log.info('!!! get_agent_quick_game  !!!!' )
        agent = self.server.agents.get(str(user._id), None)  # todo: raise exceptions if absent but not make
        if not agent:
            agent_exemplar = self.server.reg_agents.get([str(user._id)])  # todo: fix it
            if agent_exemplar is None:
                agent_exemplar = self.server.reg['/agents/user'].instantiate(
                    storage=self.server.reg_agents, name=str(user._id), login=user.name,
                )
                role_class_ex = self.server.reg['/rpg_settings/role_class/chosen_one']
                agent_exemplar.role_class = role_class_ex

            log.debug('QuickUser agent exemplar: %r', agent_exemplar)
            agent = QuickUser(
                server=self.server,
                user=user,
                time=self.server.get_time(),
                example=agent_exemplar,
            )
        else:
            agent.user = user  # Обновить юзера

        log.info('QuickGameUser INFO: %s    [car_index=%s, car_die=%s, car=%s]', user.name, user.car_index, user.car_die, agent.example.car)

        if not user.car_die and agent.example.car is None:
            log.info('QuickGameuser ws connect: %s    [car_index=%s]', user.name, user.car_index)
            # Создание "быстрой" машинки
            try:
                user.car_index = int(user.car_index)
            except:
                user.car_index = 0

            if user.car_index < 0 or user.car_index >= len(self.server.quick_game_cars_proto):
                log.warning('Unknown QuickGame car index %s', user.car_index)
                user.car_index = 0
            else:
                user.car_index = int(user.car_index)
            agent.example.car = self.server.quick_game_cars_proto[user.car_index].instantiate()
            agent.example.car.position = Point.random_gauss(self.server.quick_game_start_pos, 100)
            agent.example.current_location = None
            agent.current_location = None
            # todo: Не забыть на быструю машинку повесить пулемёты !
            log.info('Server API: New QuickGameAgent is connected and New Car is Ready !!!!!!: %r', agent)  # todo: fix text
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            # log.info('Server API: Old Agent given: %s', agent_id)
        return agent
