# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.agents import Agent
from sublayers_server.model.utils import get_time

from tornado.options import options
import random


def create_agent(registry, user, quick_flag=False):
    log.info('Try create Agent for {}'.format(user))
    try:
        agent_parent = registry.get('/registry/agents/user')
        if user.role_class_uri:
            role_class_ex = registry.get(user.role_class_uri)
        else:
            role_class_ex = registry.get('/registry/rpg_settings/role_class/chosen_one')
    except Exception as e:
        log.warning('Trouble with create agent: ')
        log.exception(e)
        role_class_ex = registry.get('/registry/rpg_settings/role_class/chosen_one')
        agent_parent = registry.get('/registry/agents/user')

    agent_example = Agent(
        login=user.name,
        user_id=str(user.pk),
        quick_flag=quick_flag,
        profile=agent_parent.instantiate(name=str(user.pk)),
    ).save()

    agent_example.profile.set_role_class(role_class_ex=role_class_ex, registry=registry)

    # todo: добавить денег для работы в библиотеке (установка скилов и перков)

    user.teaching_state = ""
    user.save()

    agent_example.save()

    log.info('Main Agent {!r} created for {}'.format(agent_example, user))
    return agent_example


def create_agent_quick_game(registry, user, main_agent_example):
    log.info('Try create Quick Agent for {}'.format(user))
    try:
        agent_parent = registry.get('/registry/agents/user/quick')
        if user.role_class_uri:
            role_class_ex = registry.get(user.role_class_uri)
        else:
            log.warning('create_agent_quick_game: user.role_class_uri not found')
            role_class_ex = registry.get('/registry/rpg_settings/role_class/chosen_one')
    except Exception as e:
        log.warning('Trouble with create agent: ')
        log.exception(e)
        role_class_ex = registry.get('/registry/rpg_settings/role_class/chosen_one')
        agent_parent = registry.get('/registry/agents/user/quick')

    agent_example = Agent(
        login=user.name,
        user_id=str(user.pk),
        quick_flag=True,
        teaching_flag=not user.quick,
        profile=agent_parent.instantiate(name=str(user.pk)),
    )
    log.warning('Make new Quick agent for %r #%s: qf=%s, srv_mode=%s', user.name, user.pk, user.quick, options.mode)
    # Если был найден агент из основной игры, то скопировать всю информацию из него
    if main_agent_example:
        # todo: Agent profile cloning mechanism
        # review: возможно нужно каждый отдельно реинстанцировать
        agent_example.profile.driving.value = main_agent_example.profile.driving.value
        agent_example.profile.shooting.value = main_agent_example.profile.shooting.value
        agent_example.profile.masking.value = main_agent_example.profile.masking.value
        agent_example.profile.leading.value = main_agent_example.profile.leading.value
        agent_example.profile.trading.value = main_agent_example.profile.trading.value
        agent_example.profile.engineering.value = main_agent_example.profile.engineering.value

        agent_example.profile.set_role_class(role_class_ex=main_agent_example.profile.role_class, registry=registry)
    else:
        log.warning('Agent from main server not founded for user: {}'.format(user.name))
        if not user.quick:
            agent_example.profile.set_role_class(role_class_ex=role_class_ex, registry=registry)
        else:
            agent_example.profile.set_role_class(role_class_ex=random.choice(registry.get('/registry/world_settings').role_class_order), registry=registry)
        agent_example.profile.set_karma(time=get_time(), value=random.randint(-80, 80))
        # Если пользователь из быстрой игры то установить рандомную аватарку
        if agent_example.quick_flag:
            avatar_list = registry.get('/registry/world_settings').avatar_list
            user.avatar_link = random.choice(avatar_list)

    agent_example.save()

    log.info('Quick Agent {!r} created for {}'.format(agent_example, user))
    return agent_example