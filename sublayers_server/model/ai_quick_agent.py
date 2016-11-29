# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import AI
from sublayers_server.model.events import Event, event_deco
from sublayers_server.model.vectors import Point
from sublayers_server.model.units import Bot
from sublayers_server.model.quest_events import OnAISee, OnAIOut

import random
import tornado.gen


class InitAIQuickCar(Event):
    def __init__(self, ai, **kw):
        server = ai.server
        super(InitAIQuickCar, self).__init__(server=server, **kw)
        self.ai = ai

    def on_perform(self):
        super(InitAIQuickCar, self).on_perform()
        self.server.ioloop.add_callback(callback=self.ai.on_timer_restart_car, event=self)


class AIQuickAgent(AI):
    def __init__(self, time, **kw):
        super(AIQuickAgent, self).__init__(time=time, **kw)
        self.create_ai_quest(time=time)
        self._quick_bot_kills = 0
        self._quick_bot_deaths = 0
        self._quick_bot_time = 0
        self._quick_bot_start_time = None
        self._quick_bot_max_lt = 0

    @event_deco
    def create_ai_quest(self, event):
        quest_parent = self.example.ai_quest
        new_quest = quest_parent.instantiate(abstract=False, hirer=None)
        new_quest.agent = self.example
        if new_quest.generate(event=event):
            self.example.add_quest(quest=new_quest, time=event.time)
            self.example.start_quest(new_quest.uid, time=event.time, server=self.server)
        else:
            log.debug('Quest<{}> dont generate for <{}>! Error!'.format(new_quest, self))
            del new_quest
        self.timer_restart_car(time=event.time)

    def timer_restart_car(self, time):
        InitAIQuickCar(ai=self, time=time).post()

    @tornado.gen.coroutine
    def on_timer_restart_car(self, event):
        if len(self.server.app.clients) < self.server.reg['world_settings'].quick_game_bot_count:
            # Добавить свою машинку на карту
            car_proto_list = self.server.quick_game_bot_cars_proto
            self.example.car = car_proto_list[random.randint(0, len(car_proto_list) - 1)].instantiate(fixtured=False)
            yield self.example.car.load_references()
            self.example.current_location = None
            self.current_location = None
            self.example.car.position = Point.random_gauss(self.server.quick_game_start_pos, 300)

            car = Bot(time=event.time, example=self.example.car, server=self.server, owner=self)
            self.append_car(car=car, time=event.time)
            self.car.fire_auto_enable(enable=True, time=event.time + 0.1)

            self._quick_bot_start_time = event.time
        else:
            self.timer_restart_car(time=event.time+30.)

    def drop_car(self, time, **kw):
        super(AIQuickAgent, self).drop_car(time=time, **kw)
        self.timer_restart_car(time=time+30.)
        life_t = time - self._quick_bot_start_time
        self._quick_bot_time += life_t
        self._quick_bot_max_lt = max(self._quick_bot_max_lt, life_t)

    @property
    def is_online(self):
        return True

    # todo: пробросить сюда Ивент
    def on_see(self, time, subj, obj):
        super(AIQuickAgent, self).on_see(time=time, subj=subj, obj=obj)
        self.example.on_event(event=Event(server=self.server, time=time), cls=OnAISee, obj=obj)

    # todo: пробросить сюда Ивент
    def on_out(self, time, subj, obj):
        super(AIQuickAgent, self).on_out(time=time, subj=subj, obj=obj)
        self.example.on_event(event=Event(server=self.server, time=time), cls=OnAIOut, obj=obj)

    def on_die(self, **kw):
        super(AIQuickAgent, self).on_die(**kw)
        self._quick_bot_deaths += 1

    def on_kill(self, **kw):
        super(AIQuickAgent, self).on_kill(**kw)
        self._quick_bot_kills += 1

