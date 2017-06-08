# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import AI
from sublayers_server.model.events import Event, event_deco
from sublayers_server.model.vectors import Point
from sublayers_server.model.units import Bot
from sublayers_server.model.quest_events import OnAISee, OnAIOut


class InitAIQuickCar(Event):
    def __init__(self, ai, **kw):
        server = ai.server
        super(InitAIQuickCar, self).__init__(server=server, **kw)
        self.ai = ai

    def on_perform(self):
        super(InitAIQuickCar, self).on_perform()
        self.ai.on_timer_restart_car(event=self)


class AIQuickAgent(AI):
    def __init__(self, time, car_proto, **kw):
        super(AIQuickAgent, self).__init__(time=time, **kw)
        self._car_proto = car_proto
        self.create_ai_quest(time=time)
        self._quick_bot_kills = 0
        self._quick_bot_deaths = 0
        self._quick_bot_time = 0
        self._quick_bot_start_time = None
        self._quick_bot_max_lt = 0
        self.worked = True

    @event_deco
    def create_ai_quest(self, event):
        quest_parent = self.example.profile.ai_quest
        new_quest = quest_parent.instantiate(abstract=False, hirer=None)
        new_quest.agent = self.example.profile
        if new_quest.generate(event=event):
            self.example.profile.add_quest(quest=new_quest, time=event.time)
            self.example.profile.start_quest(new_quest.uid, time=event.time, server=self.server)
        else:
            log.debug('Quest<{}> dont generate for <{}>! Error!'.format(new_quest, self))
            del new_quest
        self.timer_restart_car(time=event.time)

    def timer_restart_car(self, time):
        InitAIQuickCar(ai=self, time=time).post()

    def on_timer_restart_car(self, event):
        # if self.worked and len(self.server.app.clients) * 2 < self.server.reg.get('/registry/world_settings').quick_game_bot_count:
        if self.worked:
            # Добавить свою машинку на карту
            self.example.profile.car = self._car_proto.instantiate()
            self.example.profile.current_location = None
            self.current_location = None
            self.example.profile.car.position = Point.random_point(self.server.quick_game_start_pos, self.server.quick_game_respawn_bots_radius) # Радиус появления ботов в быстрой игре

            car = Bot(time=event.time, example=self.example.profile.car, server=self.server, owner=self)
            self.append_car(car=car, time=event.time)
            self.car.fire_auto_enable(enable=True, time=event.time + 0.1)

            self._quick_bot_start_time = event.time
        else:
            self.timer_restart_car(time=event.time+30.)

    def drop_car(self, time, **kw):
        super(AIQuickAgent, self).drop_car(time=time, **kw)
        self.timer_restart_car(time=time+32.)
        life_t = time - self._quick_bot_start_time
        self._quick_bot_time += life_t
        self._quick_bot_max_lt = max(self._quick_bot_max_lt, life_t)

    @property
    def is_online(self):
        return True

    # todo: пробросить сюда Ивент
    def on_see(self, time, subj, obj):
        super(AIQuickAgent, self).on_see(time=time, subj=subj, obj=obj)
        self.example.profile.on_event(event=Event(server=self.server, time=time), cls=OnAISee, obj=obj)

    # todo: пробросить сюда Ивент
    def on_out(self, time, subj, obj):
        super(AIQuickAgent, self).on_out(time=time, subj=subj, obj=obj)
        self.example.profile.on_event(event=Event(server=self.server, time=time), cls=OnAIOut, obj=obj)

    def on_die(self, **kw):
        super(AIQuickAgent, self).on_die(**kw)
        self._quick_bot_deaths += 1

    def on_kill(self, **kw):
        super(AIQuickAgent, self).on_kill(**kw)
        self._quick_bot_kills += 1
