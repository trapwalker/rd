# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import User, QuickUser
from bson.objectid import ObjectId
from sublayers_server.model.api_tools import API
from sublayers_server.model.vectors import Point
from sublayers_server.model.registry.classes.agents import Agent
import tornado.web
from random import randint


class ServerAPI(API):
    def __init__(self, server):
        """
        @type server: sublayers_server.model.event_machine.LocalServer
        """
        self.server = server

    @tornado.gen.coroutine
    def get_agent(self, user, make=False, do_disconnect=False):
        """
        @rtype sublayers_server.model.agents.Agent
        """
        agent = self.server.agents.get(str(user._id), None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            agent_exemplar = yield Agent.objects.get(profile_id=str(user._id))
            if agent_exemplar is None:
                # todo: Решить вопрос где должен создаваться агент и при каких условиях (сайт или движок)
                agent_exemplar = self.server.reg['agents/user'].instantiate(
                    name=str(user._id), login=user.name, fixtured=False, profile_id=str(user._id),
                    abstract=False,
                )
                yield agent_exemplar.load_references()
                yield agent_exemplar.save(upsert=True)
                role_class_ex = self.server.reg['rpg_settings/role_class/chosen_one']
                agent_exemplar.role_class = role_class_ex

                for class_skill in role_class_ex.class_skills:
                    # todo: Перебирать объекты реестра
                    if class_skill.target in ['driving', 'shooting', 'masking', 'leading', 'trading', 'engineering']:
                        skill = getattr(agent_exemplar, class_skill.target)
                        skill.mod = class_skill

                yield agent_exemplar.save(upsert=True)
                log.debug('Use agent exemplar: %s', agent_exemplar)

            # todo: rename User to UserAgent
            agent = User(
                server=self.server,
                user=user,
                time=self.server.get_time(),
                example=agent_exemplar,
            )
            log.info('Server API: New Agent is created: %s', agent)  # todo: fix text
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            # log.info('Server API: Old Agent given: %s', agent_id)
        raise tornado.gen.Return(agent)

    @tornado.gen.coroutine
    def get_agent_quick_game(self, user, do_disconnect=False):
        # User здесь обязательно QuickUser
        assert user.quick
        log.info('!!! get_agent_quick_game  !!!!' )
        agent = self.server.agents.get(str(user._id), None)  # todo: raise exceptions if absent but not make
        if not agent:
            agent_exemplar = yield Agent.objects.get(profile_id=str(user._id))
            if agent_exemplar is None:
                agent_exemplar = self.server.reg['agents/user/quick'].instantiate(
                    #storage=self.application.reg_agents,
                    login=user.name,
                    profile_id=str(user._id),
                    name=str(user._id),
                    fixtured=False,
                )
                yield agent_exemplar.load_references()
                role_class_ex = self.server.reg['rpg_settings/role_class/chosen_one']
                agent_exemplar.role_class = role_class_ex
                yield agent_exemplar.save(upsert=True)

            log.debug('QuickUser agent exemplar: %s', agent_exemplar)
            agent = QuickUser(
                server=self.server,
                user=user,
                time=self.server.get_time(),
                example=agent_exemplar,
            )
        else:
            agent.user = user  # Обновить юзера

        log.info('QuickGameUser INFO: %s    [car_index=%s,  car=%s]', user.name, user.car_index, agent.example.car)

        if agent.example.car is None or agent.car is None:
            yield agent.init_example_car()
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            # log.info('Server API: Old Agent given: %s', agent_id)
        raise tornado.gen.Return(agent)

    @tornado.gen.coroutine
    def get_agent_teaching(self, user, do_disconnect=False):
        # User здесь обязательно QuickUser
        assert not user.quick
        log.info('!!! get_agent_teaching_mode  !!!!')
        agent = self.server.agents.get(str(user._id), None)  # todo: raise exceptions if absent but not make
        if not agent:
            agent_exemplar = yield Agent.objects.get(profile_id=str(user._id))
            if agent_exemplar is None:
                agent_exemplar = self.server.reg['agents/user'].instantiate(
                    #storage=self.application.reg_agents,
                    login=user.name,
                    profile_id=str(user._id),
                    name=str(user._id),
                    fixtured=False,
                )
                yield agent_exemplar.load_references()
                role_class_ex = self.server.reg['rpg_settings/role_class/chosen_one']
                agent_exemplar.role_class = role_class_ex
                yield agent_exemplar.save(upsert=True)

            log.debug('User agent exemplar: %s', agent_exemplar)
            agent = QuickUser(
                server=self.server,
                user=user,
                time=self.server.get_time(),
                example=agent_exemplar,
            )
        else:
            agent.user = user  # Обновить юзера

        user.car_index = randint(0, len(self.server.quick_game_cars_proto) - 1)

        log.info('GameUser INFO: %s    [car_index=%s,  car=%s]', user.name, user.car_index, agent.example.car)

        if agent.example.car is None:
            log.info('Gameuser ws connect: %s    [car_index=%s]', user.name, user.car_index)
            # Создание "быстрой" машинки
            agent.example.car = self.server.quick_game_cars_proto[user.car_index].instantiate(fixtured=False)
            yield agent.example.car.load_references()

            agent.example.car.position = Point.random_gauss(self.server.quick_game_start_pos, 100)
            agent.example.current_location = None
            agent.current_location = None
            log.info('Server API: New GameAgent is connected and New Car is Ready !!!!!!: %s', agent)  # todo: fix text
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            # log.info('Server API: Old Agent given: %s', agent_id)
        raise tornado.gen.Return(agent)