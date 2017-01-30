# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import User, QuickUser, TeachingUser
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
            # agent_exemplar = yield Agent.objects.get(profile_id=str(user._id), quick_flag=False, teaching_flag=False)
            agent_exemplar = yield Agent.objects.filter(profile_id=str(user._id), quick_flag=False, teaching_flag=False).find_all()
            agent_exemplar = agent_exemplar and agent_exemplar[0] or None
            if agent_exemplar is None:
                log.warning('Agent for user {} not found! Create new Agent'.format(user.name))
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
                log.debug('New agent exemplar: %s', agent_exemplar)

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
        assert user.quick or user.is_tester
        agent = self.server.agents.get(str(user._id), None)  # todo: raise exceptions if absent but not make
        if not agent:
            # agent_exemplar = yield Agent.objects.get(profile_id=str(user._id), quick_flag=True)
            agent_exemplar = yield Agent.objects.filter(profile_id=str(user._id), quick_flag=True, teaching_flag=False).find_all()
            agent_exemplar = agent_exemplar and agent_exemplar[0] or None
            if agent_exemplar is None:
                agent_exemplar = self.server.reg['agents/user/quick'].instantiate(
                    #storage=self.application.reg_agents,
                    login=user.name,
                    profile_id=str(user._id),
                    name=str(user._id),
                    fixtured=False,
                )
                yield agent_exemplar.load_references()
                yield agent_exemplar.save(upsert=True)
                role_class_list = self.server.reg['world_settings'].role_class_order
                agent_exemplar.role_class = role_class_list[randint(0, len(role_class_list) - 1)]

                agent_exemplar.set_karma(time=self.server.get_time(), value=randint(-80, 80))
                agent_exemplar.set_exp(time=self.server.get_time(), value=1005)
                agent_exemplar.driving.value = 20
                agent_exemplar.shooting.value = 20
                agent_exemplar.masking.value = 20
                agent_exemplar.leading.value = 20
                agent_exemplar.trading.value = 20
                agent_exemplar.engineering.value = 20
                agent_exemplar.quick_flag = True
                agent_exemplar.teaching_flag = False
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

        # Установить рандомную аватарку
        avatar_list = self.server.reg['world_settings'].avatar_list
        user.avatar_link = avatar_list[randint(0, len(avatar_list) - 1)]

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
        agent = self.server.agents.get(str(user._id), None)  # todo: raise exceptions if absent but not make

        if not agent:
            # Если нет подключённого агента, то мы не ищем в базе, а просто создаём нового!
            agent_exemplar = yield Agent.objects.filter(profile_id=str(user._id), quick_flag=True).find_all()
            agent_exemplar = agent_exemplar and agent_exemplar[0] or None

            main_agent_exemplar = yield Agent.objects.filter(profile_id=str(user._id), quick_flag=False).find_all()
            main_agent_exemplar = main_agent_exemplar and main_agent_exemplar[0] or None

            if agent_exemplar is None:
                agent_exemplar = self.server.reg['agents/user/quick'].instantiate(
                    login=user.name,
                    profile_id=str(user._id),
                    name=str(user._id),
                    fixtured=False,
                )
                yield agent_exemplar.load_references()
                role_class_list = self.server.reg['world_settings'].role_class_order
                agent_exemplar.role_class = role_class_list[randint(0, len(role_class_list) - 1)]
                # todo: убрать тут is_tester
                agent_exemplar.quick_flag = user.quick or user.is_tester

                # Если был найден агент из основной игры, то скопировать всю информацию из него
                if main_agent_exemplar:
                    # review: возможно нужно каждый отдельно реинстанцировать
                    agent_exemplar.driving = main_agent_exemplar.driving
                    agent_exemplar.shooting = main_agent_exemplar.shooting
                    agent_exemplar.masking = main_agent_exemplar.masking
                    agent_exemplar.leading = main_agent_exemplar.leading
                    agent_exemplar.trading = main_agent_exemplar.trading
                    agent_exemplar.engineering = main_agent_exemplar.engineering
                    agent_exemplar.perks = main_agent_exemplar.perks
                    agent_exemplar.role_class = main_agent_exemplar.role_class
                else:
                    # todo: убрать тут is_tester
                    if not user.quick and not user.is_tester:
                        log.warning('Agent from main server not founded for user: {}'.format(user.name))
                    agent_exemplar.set_karma(time=self.server.get_time(), value=randint(-80, 80))
                    agent_exemplar.set_exp(time=self.server.get_time(), value=1005)
                    agent_exemplar.driving.value = 20
                    agent_exemplar.shooting.value = 20
                    agent_exemplar.masking.value = 20
                    agent_exemplar.leading.value = 20
                    agent_exemplar.trading.value = 20
                    agent_exemplar.engineering.value = 20

                    # Если пользователь из быстрой игры то установить рандомную аватарку
                    if agent_exemplar.quick_flag:
                        avatar_list = self.server.reg['world_settings'].avatar_list
                        user.avatar_link = avatar_list[randint(0, len(avatar_list) - 1)]
            else:
                log.warning('Agent founded {}'.format(user.name))

            yield agent_exemplar.save()
            agent = TeachingUser(
                # agent=TeachingUser(
                server=self.server,
                user=user,
                time=self.server.get_time(),
                example=agent_exemplar,
            )
        else:
            agent.user = user  # Обновить юзера

        log.info('User INFO: %s [car_index=%s,  car=%s]', user.name, user.car_index, agent.example.car)
        if agent.example.car is None or agent.car is None:
            yield agent.init_example_car()
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            # log.info('Server API: Old Agent given: %s', agent_id)
        raise tornado.gen.Return(agent)
