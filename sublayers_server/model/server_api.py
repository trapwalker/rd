# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import User, QuickUser, TeachingUser
from sublayers_server.model.api_tools import API
from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_common.creater_agent import create_agent, create_agent_quick_game

import random
from tornado.options import options
from ctx_timer import Timer


class ServerAPI(API):
    def __init__(self, server):
        """
        @type server: sublayers_server.model.event_machine.LocalServer
        """
        self.server = server

    def get_agent_by_user_pk(self, user):
        return self.server.agents.get(str(user.pk), None)

    def get_agent(self, user, make=None, do_disconnect=False):
        """
        @rtype sublayers_server.model.agents.Agent
        """
        if make is None:
            make = user.quick
        agent = self.server.agents.get(str(user.pk), None)  # todo: raise exceptions if absent but not make
        if not agent and make:
            is_created = False
            agent_exemplar = Agent.objects.filter(user_id=str(user.pk), quick_flag=options.mode == 'quick').first()
            if agent_exemplar is None:
                is_created = True
                log.warning('Agent for user {} not found! Create new Agent'.format(user.name))
                # todo: doit
                agent_exemplar = create_agent(registry=self.server.reg, user=user)

                log.warning('Make new agent for %r #%s: qf=%s, srv_mode=%s', user.name, user.pk, user.quick,
                            options.mode)
                if options.mode == 'quick':
                    log.warning(u'ВНИМАНИЕ!!! Создан обычный тпользователь в режиме быстрой игры!')

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
            if not is_created:
                agent.on_load()
        else:
            if agent and do_disconnect:
                if agent.connection:
                    agent.connection.close()
            # log.info('Server API: Old Agent given: %s', agent_id)

        if agent and agent.user.teaching_state != 'cancel' and agent.user.teaching_state != 'done':
            agent.user.reload()
            if agent.user.teaching_state == 'city':
                agent.create_teaching_quest(time=self.server.get_time())

        return agent

    def get_agent_teaching(self, user, do_disconnect=False):
        agent = self.server.agents.get(str(user.pk), None)  # todo: raise exceptions if absent but not make
        if not agent:
            # Если нет подключённого агента, то мы не ищем в базе, а просто создаём нового!
            agent_exemplar = Agent.objects.filter(user_id=str(user.pk), quick_flag=True).first()
            main_agent_exemplar = Agent.objects.filter(user_id=str(user.pk), quick_flag=False).first()

            if agent_exemplar is None:
                agent_exemplar = create_agent_quick_game(registry=self.server.reg, user=user,
                                                         main_agent_example=main_agent_exemplar)
            else:
                log.warning('Agent founded {}'.format(user.name))

            agent = TeachingUser(
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
