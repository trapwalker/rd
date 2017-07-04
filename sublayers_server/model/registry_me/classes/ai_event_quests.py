# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.quests import Quest
from sublayers_server.model.registry_me.tree import IntField


class AIEventQuest(Quest):
    delay_time = IntField(root_default=60, caption=u'Минимальное время, которое должно пройти перед генерацией такого же квеста')

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

    def deploy_bots(self, event):
        # Метод деплоя агентов на карту. Вызывается на on_start квеста
        from sublayers_server.model.ai_dispatcher import AIAgent
        from sublayers_server.model.registry_me.classes.agents import Agent as AgentExample

        car_proto = event.server.reg.get('/registry/mobiles/cars/heavy/btrs/m113a1/quick_bot')
        example_profile = event.server.reg.get('/registry/agents/user/ai_quest/traffic')

        # todo: сделать несколько видов профилей ботов, чтобы там были прокачаны скилы и перки
        example_agent = AgentExample(
            login='',
            user_id='',
            profile=example_profile.instantiate(
                name='',
                role_class='/registry/rpg_settings/role_class/chosen_one',
            )
        )

        route = event.server.reg.get('/registry/routes/whitehill_paloma_simple').instantiate()

        self.dc._main_agent = AIAgent(car_proto=car_proto,
                                      route=route,
                                      example=example_agent,
                                      user=None, time=event.time, server=event.server
                                      )

    def displace_bots(self, event):
        # Метод удаления с карты агентов-ботов. Вызывается на при завершении квеста
        self.dc._main_agent.displace(time=event.time)
        self.dc._main_agent = None

    def get_traffic_status(self, event):
        if self.dc._main_agent.car is None:
            return 'fail'
        # todo: спросить у маршрута, пройден ли он и если да, то вернуть 'win'

    # todo: Список возможных маршрутов
    # todo: Список возможных типов ботов (охрана, доехать и тд)
    # todo: Список возможных машинок для ботов

