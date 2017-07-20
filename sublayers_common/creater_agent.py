# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.agents import Agent


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
        agent_parent = '/registry/agents/user'
        role_class_ex = '/registry/rpg_settings/role_class/chosen_one'

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

    log.info('Agent {!r} created for {}'.format(agent_example, user))
    return agent_example


def create_agent_quick_game(registry, user, main_agent_example):
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
        agent_parent = '/registry/agents/user'
        role_class_ex = '/registry/rpg_settings/role_class/chosen_one'

    agent_example = Agent(
        login=user.name,
        user_id=str(user.pk),
        quick_flag=True,
        profile=agent_parent.instantiate(name=str(user.pk)),
    ).save()


    agent_exemplar = Agent(
        login=user.name,
        user_id=str(user.pk),
        quick_flag=True,
        teaching_flag=main_agent_exemplar is not None,
        #fixtured=False,  # todo: add `'fixtured' flag to Agent

        profile=self.server.reg.get('/registry/agents/user/quick').instantiate(
            name=str(user.pk),
            role_class=random.choice(self.server.reg.get('/registry/world_settings').role_class_order),
        ),
    )
    log.warning('Make new agent for %r #%s: qf=%s, srv_mode=%s', user.name, user.pk, user.quick, options.mode)
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


    if main_agent_example:
        pass

    else:
        agent_example.profile.set_role_class(role_class_ex=role_class_ex, registry=registry)

    agent_example.save()

    log.info('Agent {!r} created for {}'.format(agent_example, user))
    return agent_example