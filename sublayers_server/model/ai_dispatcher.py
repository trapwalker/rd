# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import AI
from sublayers_server.model.events import event_deco
from sublayers_server.model.vectors import Point
from sublayers_server.model.units import Bot
from sublayers_server.model.base import Observer
from sublayers_common.ctx_timer import T
import traceback


class AIDispatcher(AI):
    def __init__(self, time, quest_example, **kw):
        super(AIDispatcher, self).__init__(time=time, **kw)
        self.create_ai_dispatcher_quest(time=time, quest_example=quest_example)

    @event_deco
    def create_ai_dispatcher_quest(self, event, quest_example):
        if quest_example.can_instantiate(event=event, agent=self.example, hirer=None):
            new_quest = quest_example.instantiate(abstract=False, hirer=None)
            if new_quest.generate(event=event, agent=self.example):
                self.example.profile.add_quest(quest=new_quest, time=event.time)
                self.example.profile.start_quest(new_quest.uid, time=event.time, server=self.server)
            else:
                log.debug('AIDispatcher not started!!!')
                del new_quest


class AIAgent(AI):
    def __init__(self, time, **kw):
        super(AIAgent, self).__init__(time=time, **kw)
        self.action_quest = None
        self.event_quest = None  # ссылка на квест-эвент, чтобы можно было получить доступ из action_quest

    def print_login(self):
        str_list = self._login.split('_')
        if len(str_list) > 1:
            return '_'.join(str_list[:-1])
        else:
            return self._login

    @event_deco
    def create_ai_quest(self, event, action_quest):
        self.action_quest = action_quest
        if action_quest and action_quest.generate(event=event, agent=self.example):
            self.example.profile.add_quest(quest=action_quest, time=event.time)
            self.example.profile.start_quest(action_quest.uid, time=event.time, server=self.server)
        else:
            log.debug('Quest<{}> dont generate for <{}>! Error!'.format(action_quest, self))
            del action_quest

    @event_deco
    def generate_car(self, event, car_example):
        # Добавить свою машинку на карту
        profile = self.example.profile
        profile.car = car_example
        self.current_location = None
        car = Bot(time=event.time, example=car_example, server=self.server, owner=self)
        self.append_car(car=car, time=event.time)
        self.car.fire_auto_enable(enable=True, time=event.time + 0.1)

    def drop_car(self, time, **kw):
        super(AIAgent, self).drop_car(time=time, **kw)
        # todo: сообщить о завершении квеста

    @event_deco
    def displace(self, event):
        self.save(time=event.time)
        if self.car:
            self.car.displace(time=event.time)
        # todo: выйти из пати, удалить все инвайты, а только потом удалиться из списка агентов
        if self.server.agents_by_name.get(self._login, None):
            del self.server.agents_by_name[self._login]
        else:
            log.warn("Agent %s with key %s not found in server.agents_by_name", self, self._login)
        # log.info('Agent %s displaced by quest', self)
        self.after_delete(event.time)

    @property
    def is_online(self):
        return True

    def is_target(self, target):
        if self.action_quest:
            return self.action_quest.is_target(target=target)
        else:
            return super(AIAgent, self).is_target(target=target)

    def on_get_damage(self, damager, **kw):
        super(AIAgent, self).on_get_damage(damager=damager, **kw)
        damager_uid = damager.uid
        target_uid_list = self.event_quest.dc.target_uid_list
        if not isinstance(damager, Observer):
            log.debug('on_get_damage: damager not observer: %s', damager)
            log.debug(''.join(traceback.format_stack()))
            return
        if damager_uid not in target_uid_list:
            target_uid_list.append(damager_uid)

    def on_see(self, time, subj, obj):
        super(AIAgent, self).on_see(time=time, subj=subj, obj=obj)

    def on_out(self, time, subj, obj):
        super(AIAgent, self).on_out(time=time, subj=subj, obj=obj)