# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import AI
from sublayers_server.model.events import event_deco
from sublayers_server.model.vectors import Point
from sublayers_server.model.units import Bot


class AIDispatcher(AI):
    def __init__(self, time, quest_example, **kw):
        super(AIDispatcher, self).__init__(time=time, **kw)
        self.create_ai_quest(time=time, quest_example=quest_example)

    @event_deco
    def create_ai_quest(self, event, quest_example):
        new_quest = quest_example.instantiate(abstract=False, hirer=None)
        if new_quest.generate(event=event, agent=self.example):
            self.example.profile.add_quest(quest=new_quest, time=event.time)
            self.example.profile.start_quest(new_quest.uid, time=event.time, server=self.server)
        else:
            log.debug('AIDispatcher not started!!!')
            del new_quest


class AIAgent(AI):
    def __init__(self, time, car_proto, action_quest, route, **kw):
        super(AIAgent, self).__init__(time=time, **kw)
        self.car_proto = car_proto
        self.action_quest = action_quest
        self.route = route
        self.create_ai_quest(time=time)

    def print_login(self):
        str_list = self._login.split('_')
        if len(str_list) > 1:
            return '_'.join(str_list[:-1])
        else:
            return self._login

    @event_deco
    def create_ai_quest(self, event):
        if self.action_quest:
            new_quest = self.action_quest.instantiate(abstract=False, hirer=None)
            if new_quest.generate(event=event, agent=self.example):
                self.example.profile.add_quest(quest=new_quest, time=event.time)
                self.example.profile.start_quest(new_quest.uid, time=event.time, server=self.server)
            else:
                log.debug('Quest<{}> dont generate for <{}>! Error!'.format(new_quest, self))
                del new_quest
        self.generate_car(time=event.time)

    @event_deco
    def generate_car(self, event):
        # Добавить свою машинку на карту
        self.example.profile.car = self.car_proto.instantiate()
        self.example.profile.current_location = None
        self.current_location = None
        self.example.profile.car.position = Point.random_gauss(Point(12482409, 27045819), 100)  # todo: забрать из квеста-поведения

        car = Bot(time=event.time, example=self.example.profile.car, server=self.server, owner=self)
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
        log.info('Agent %s displaced by quest', self)
        self.after_delete(event.time)

    @property
    def is_online(self):
        return True

