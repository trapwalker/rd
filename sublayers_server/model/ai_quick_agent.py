# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import Agent
from sublayers_server.model.events import Event
from sublayers_server.model.vectors import Point
from sublayers_server.model.units import Bot

import tornado.gen


class InitAIQuickCar(Event):
    def __init__(self, ai, **kw):
        server = ai.server
        super(InitAIQuickCar, self).__init__(server=server, **kw)
        self.ai = ai

    def on_perform(self):
        super(InitAIQuickCar, self).on_perform()
        self.server.ioloop.add_callback(callback=self.ai.on_timer_restart_car, event=self)


class AIQuickAgent(Agent):
    def __init__(self, time, **kw):
        super(AIQuickAgent, self).__init__(time=time, **kw)
        self.timer_restart_car(time=time)

    def timer_restart_car(self, time):
        InitAIQuickCar(ai=self, time=time).post()

    @tornado.gen.coroutine
    def on_timer_restart_car(self, event):
        print 'on_timer_restart_car'
        # todo: сделать правильно!
        if len(self.server.app.clients) < 10:
            # Добавить свою машинку на карту
            self.example.car = self.server.quick_game_cars_proto[0].instantiate(fixtured=False)
            yield self.example.car.load_references()

            self.example.car.position = Point.random_gauss(self.server.quick_game_start_pos, 100)
            self.example.current_location = None
            self.current_location = None

            self.car = Bot(time=event.time, example=self.example.car, server=self.server, owner=self)
            self.append_car(car=self.car, time=event.time)

            quest = self.example.ai_quest
            new_quest = quest.instantiate(abstract=False, hirer=None)
            new_quest.agent = self.example
            if new_quest.generate(event=event):
                self.example.add_quest(quest=new_quest, time=event.time)
                self.example.start_quest(new_quest.uid, time=self.server.get_time(), server=self.server)
            else:
                del new_quest
        else:
            self.timer_restart_car(time=event.time+30.)

    def drop_car(self, time, **kw):
        super(AIQuickAgent, self).drop_car(time=time, **kw)
        self.timer_restart_car(time=time+30.)

