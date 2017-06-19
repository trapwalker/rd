# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import User, QuickUser, TeachingUser
from sublayers_server.model.api_tools import API
from sublayers_server.model.registry_me.classes.agents import Agent

import random


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
        agent = self.server.agents.get(str(user.pk), None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            # agent_exemplar = yield Agent.objects.get(user_id=user.pk, quick_flag=False, teaching_flag=False)
            agent_exemplar = Agent.objects.filter(user_id=str(user.pk), quick_flag=False, teaching_flag=False).all()
            agent_exemplar = agent_exemplar and agent_exemplar[0] or None
            if agent_exemplar is None:
                log.warning('Agent for user {} not found! Create new Agent'.format(user.name))
                # todo: doit
                agent_exemplar = Agent(
                    login=user.name,
                    user_id=str(user.pk),
                    profile=dict(
                        parent='/registry/agents/user',
                        name=str(user.pk),
                        role_class='/registry/rpg_settings/role_class/chosen_one',  # todo: Убрать как наследуемый?
                    ),
                ).save()

                for class_skill in agent_exemplar.profile.role_class.class_skills():
                    # todo: Перебирать объекты реестра
                    if class_skill.target in ['driving', 'shooting', 'masking', 'leading', 'trading', 'engineering']:
                        skill = getattr(agent_exemplar.profile, class_skill.target)
                        skill.mod = class_skill

                agent_exemplar.save()
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
        return agent

    def get_agent_quick_game(self, user, do_disconnect=False):
        # User здесь обязательно QuickUser
        assert user.quick
        agent = self.server.agents.get(str(user.pk), None)  # todo: raise exceptions if absent but not make
        if not agent:
            # agent_exemplar = yield Agent.objects.get(user_id=user.pk, quick_flag=True)
            agent_exemplar = Agent.objects.filter(user_id=str(user.pk), quick_flag=True, teaching_flag=False).first()
            if agent_exemplar is None:
                role_class_list = self.server.reg.get('/registry/world_settings').role_class_order
                assert role_class_list, 'role_class_list is empty in server settings'
                agent_exemplar = Agent(
                    login=user.name,
                    user_id=str(user.pk),
                    profile=dict(
                        parent='/registry/agents/user/quick',
                        name=str(user.pk),
                        role_class=random.choice(role_class_list),
                        karma=random.randint(-80, 80),
                    ),
                ).save()

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
        avatar_list = self.server.reg.get('/registry/world_settings').avatar_list
        user.avatar_link = random.choice(avatar_list)
        log.info('QuickGameUser INFO: %s    [car_index=%s,  car=%s]', user.name, user.car_index, agent.example.profile.car)

        if agent.example.profile.car is None or agent.car is None:
            agent.init_example_car()
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            # log.info('Server API: Old Agent given: %s', agent_id)
        return agent

    def get_agent_teaching(self, user, do_disconnect=False):
        agent = self.server.agents.get(str(user.pk), None)  # todo: raise exceptions if absent but not make

        if not agent:
            # Если нет подключённого агента, то мы не ищем в базе, а просто создаём нового!
            agent_exemplar = Agent.objects.filter(user_id=str(user.pk), quick_flag=True).first()
            main_agent_exemplar = Agent.objects.filter(user_id=str(user.pk), quick_flag=False).first()

            if agent_exemplar is None:
                agent_exemplar = Agent(
                    login=user.name,
                    user_id=str(user.pk),
                    quick_flag=user.quick,
                    #fixtured=False,  # todo: add `'fixtured' flag to Agent

                    profile=self.server.reg.get('/registry/agents/user/quick').instantiate(
                        name=str(user.pk),
                        role_class=random.choice(self.server.reg.get('/registry/world_settings').role_class_order),
                    ),
                )
                # Если был найден агент из основной игры, то скопировать всю информацию из него
                if main_agent_exemplar:
                    # todo: Agent profile cloning mechanism
                    # review: возможно нужно каждый отдельно реинстанцировать
                    agent_exemplar.profile.driving     = main_agent_exemplar.profile.driving
                    agent_exemplar.profile.shooting    = main_agent_exemplar.profile.shooting
                    agent_exemplar.profile.masking     = main_agent_exemplar.profile.masking
                    agent_exemplar.profile.leading     = main_agent_exemplar.profile.leading
                    agent_exemplar.profile.trading     = main_agent_exemplar.profile.trading
                    agent_exemplar.profile.engineering = main_agent_exemplar.profile.engineering
                    agent_exemplar.profile.perks       = main_agent_exemplar.profile.perks
                    agent_exemplar.profile.role_class  = main_agent_exemplar.profile.role_class
                else:
                    if not user.quick:
                        log.warning('Agent from main server not founded for user: {}'.format(user.name))
                    agent_exemplar.profile.set_karma(time=self.server.get_time(), value=random.randint(-80, 80))
                    agent_exemplar.profile.set_exp(time=self.server.get_time(), value=1005)
                    agent_exemplar.profile.driving.value = 20
                    agent_exemplar.profile.shooting.value = 20
                    agent_exemplar.profile.masking.value = 20
                    agent_exemplar.profile.leading.value = 20
                    agent_exemplar.profile.trading.value = 20
                    agent_exemplar.profile.engineering.value = 20

                    # Если пользователь из быстрой игры то установить рандомную аватарку
                    if agent_exemplar.quick_flag:
                        avatar_list = self.server.reg.get('/registry/world_settings').avatar_list
                        user.avatar_link = random.choice(avatar_list)
            else:
                log.warning('Agent founded {}'.format(user.name))

            agent_exemplar.save()
            agent = TeachingUser(
                # agent=TeachingUser(
                server=self.server,
                user=user,
                time=self.server.get_time(),
                example=agent_exemplar,
            )
        else:
            agent.user = user  # Обновить юзера

        log.info('User INFO: %s [car_index=%s,  car=%s]', user.name, user.car_index, agent.example.profile.car)
        if agent.example.profile.car is None or agent.car is None:
            agent.init_example_car()
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            # log.info('Server API: Old Agent given: %s', agent_id)
        return agent
