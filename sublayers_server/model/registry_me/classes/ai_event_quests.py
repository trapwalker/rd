# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.quests import Quest
from sublayers_server.model.registry_me.tree import IntField, ListField, RegistryLinkField, EmbeddedNodeField


import random


class AIEventQuest(Quest):
    delay_time = IntField(root_default=60, caption=u'Минимальное время, между генерациями одного квеста')
    cars = ListField(
        root_default=list,
        caption=u'Список машинок',
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.mobiles.Car'),
    )


    def can_instantiate(self, event, agent):  # info: попытка сделать can_generate до инстанцирования квеста
        # log.debug('can_generate {} {!r}'.format(self.generation_group, self.parent))
        agent_quests_active = agent.profile.quests_active

        # Этапы проверки:
        # Квест не сгенерируется, если:
        # - парент одинаковый и
        # - достигнуто максимальное количество квестов в данной generation_group и
        # - После сдачи квеста не вышел кулдаун и
        # - После выдачи квеста не прошёл delay_time

        generation_count = 0
        current_time = event.time
        target_parent = self.parent
        target_group = self.generation_group
        for q in agent_quests_active:
            if q.parent == target_parent and q.generation_group == target_group:
                if not q.endtime or q.endtime + q.generation_cooldown > current_time:  # todo: правильно проверять завершённые квестов
                    generation_count += 1
                if q.starttime and q.starttime + q.delay_time > current_time:
                    return False  # Если был выдан хоть один подобный квест, то ждать delay_time обязательно!
        return generation_count < self.generation_max_count


class AITrafficQuest(AIEventQuest):
    test_end_time = IntField(caption=u'Интервал проверки достижения цели')
    routes = ListField(
        root_default=list,
        caption=u"Список маршрутов",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.routes.Route',
        ),
        reinst=True,
    )

    def deploy_bots(self, event):
        # Метод деплоя агентов на карту. Вызывается на on_start квеста
        from sublayers_server.model.ai_dispatcher import AIAgent
        from sublayers_server.model.registry_me.classes.agents import Agent as AgentExample

        if not self.routes or not self.cars:
            return

        car_proto = random.choice(self.cars).instantiate()
        route = random.choice(self.routes).instantiate()
        example_profile = event.server.reg.get('/registry/agents/user/ai_quest')
        action_quest = event.server.reg.get('/registry/quests/ai_action_quest/traffic')

        # todo: сделать несколько видов профилей ботов, чтобы там были прокачаны скилы и перки
        example_agent = AgentExample(
            login='',
            user_id='',
            profile=example_profile.instantiate(
                name='',
                role_class='/registry/rpg_settings/role_class/chosen_one',  # todo: рандомизировать
            )
        )

        self.dc._main_agent = AIAgent(
            example=example_agent,
            user=None, time=event.time, server=event.server
        )

        action_quest = action_quest.instantiate(abstract=False, hirer=None, route=route)
        self.dc._main_agent.create_ai_quest(time=event.time, action_quest=action_quest)
        car_example = car_proto.instantiate(position=route.get_start_point())
        self.dc._main_agent.generate_car(time=event.time, car_example=car_example)

    def displace_bots(self, event):
        # Метод удаления с карты агентов-ботов. Вызывается на при завершении квеста
        self.dc._main_agent.displace(time=event.time)
        self.dc._main_agent = None

    def get_traffic_status(self, event):
        main_agent = getattr(self.dc, '_main_agent', None)
        if main_agent and main_agent.car is None:
            return 'fail'
        if main_agent.action_quest and main_agent.action_quest.status == 'end':
            # спросить у квеста, пройден ли он и если да, то вернуть 'win'
            return main_agent.action_quest.result
