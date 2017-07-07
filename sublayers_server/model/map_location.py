# -*- coding: utf-8 -*-
from __future__ import print_function

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.base import Observer
from sublayers_server.model.units import Unit, ExtraMobile
from sublayers_server.model.messages import (
    EnterToLocation, ExitFromLocation, ChangeLocationVisitorsMessage, UserExampleSelfMessage, PreEnterToLocation,
    TownAttackMessage
)
from sublayers_server.model.game_log_messages import LocationLogMessage
from sublayers_server.model.registry_me.uri import URI
from sublayers_server.model.vectors import Point
from sublayers_server.model.events import ActivateLocationChats, Event, event_deco
from sublayers_server.model.chat_room import ChatRoom, PrivateChatRoom
from sublayers_server.model.registry_me.classes.trader import TraderRefreshEvent, Trader
from sublayers_server.model.inventory import Inventory

from tornado.options import options
import random


class RadioPoint(Observer):
    def __init__(self, time, **kw):
        super(RadioPoint, self).__init__(time=time, **kw)
        self.room = None
        self.name = self.example.radio_point_name

    def on_init(self, event):
        super(RadioPoint, self).on_init(event)
        self.room = ChatRoom(time=event.time, name=self.name)

    def on_contact_in(self, time, obj):
        super(RadioPoint, self).on_contact_in(time=time, obj=obj)
        obj.add_to_chat(chat=self, time=time)

    def on_contact_out(self, time, obj):
        super(RadioPoint, self).on_contact_out(time=time, obj=obj)
        obj.del_from_chat(chat=self, time=time)


class MapLocation(Observer):
    locations = []

    def __init__(self, **kw):
        super(MapLocation, self).__init__(**kw)
        self.visitors = []
        self.radio_points = []
        # log.debug('Map_location example %s', self.example.uri)
        self.locations.append(self)

        # Свалка
        self.inventory = Inventory(max_size=100, owner=self)

    def can_come(self, agent, time):
        return False

    def activate_chats(self, event):
        agent = event.agent
        for chat in self.radio_points:
            chat.room.include(agent=agent, time=event.time)

    def generate_quests(self, event, agent):
        for building in self.example.buildings or []:
            head = building.head
            for quest in head and head.quests or []:
                for x in xrange(0, quest.generation_max_count):
                    new_quest = quest.instantiate(abstract=False, hirer=head)
                    if new_quest.generate(event=event, agent=agent.example):
                        agent.example.profile.add_quest(quest=new_quest, time=event.time)
                    else:
                        del new_quest


    def on_enter(self, agent, event):
        agent.on_enter_location(location=self, event=event)  # todo: (!)
        PreEnterToLocation(agent=agent, location=self, time=event.time).post()
        self.generate_quests(event=event, agent=agent)
        ActivateLocationChats(agent=agent, location=self, time=event.time + 0.1).post()

        # Добавить агента в список менеджеров мусорки
        if self.inventory is not None:
            self.inventory.add_visitor(agent=agent, time=event.time)
            self.inventory.add_manager(agent=agent)
        EnterToLocation(agent=agent, location=self, time=event.time).post()  # отправть сообщения входа в город
        LocationLogMessage(agent=agent, location=self, action='enter', time=event.time).post()

        for visitor in self.visitors:  # todo: optimize
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent._login, action=True, time=event.time).post()
            ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor._login, action=True, time=event.time).post()
        agent.current_location = self
        self.visitors.append(agent)
        # todo: review
        Event(
            server=agent.server, time=event.time,
            callback_after=lambda event: UserExampleSelfMessage(agent=agent, time=event.time).post()
        ).post()

    def on_re_enter(self, agent, event):
        log.warning(u'ВНИМАНИЕ! [MapLocation.on_re_enter] Тут раньше сохранялся агент. Сохранение отключено для анализа производительности.')
        # agent.save(event.time)  # todo: Уточнить можно ли сохранять здесь
        if agent in self.visitors:
            PreEnterToLocation(agent=agent, location=self, time=event.time).post()
            # todo: review agent.on_enter_location call
            agent.on_enter_location(location=self, event=event)
            EnterToLocation(agent=agent, location=self, time=event.time).post()  # отправть сообщения входа в город
            LocationLogMessage(agent=agent, location=self, action='enter', time=event.time).post()

            for visitor in self.visitors:
                if not visitor is agent:
                    ChangeLocationVisitorsMessage(agent=agent, visitor_login=visitor._login, action=True, time=event.time).post()
            self.inventory.send_inventory(agent, event.time)
        else:
            self.on_enter(agent=agent, event=event)

    def on_exit(self, agent, event):
        self.visitors.remove(agent)
        agent.current_location = None
        agent.on_exit_location(location=self, event=event)
        for chat in self.radio_points:
            chat.room.exclude(agent=agent, time=event.time)  # todo: Пробросить event вместо time ##refactor
        PrivateChatRoom.close_privates(agent=agent, time=event.time)  # todo: Пробросить event вместо time ##refactor

        # Удалить агента из списка менеджеров мусорки
        if self.inventory is not None:
            self.inventory.del_visitor(agent=agent, time=event.time)  # todo: Пробросить event вместо time ##refactor
            self.inventory.del_manager(agent=agent)

        ExitFromLocation(agent=agent, time=event.time).post()  # отправть сообщения входа в город
        LocationLogMessage(agent=agent, action='exit', location=self, time=event.time).post()

        agent.api.update_agent_api(time=event.time)  # todo: Пробросить event вместо time? ##refactor
        for visitor in self.visitors:
            ChangeLocationVisitorsMessage(agent=visitor, visitor_login=agent._login, action=False, time=event.time).post()

    def add_to_chat(self, chat, time):
        super(MapLocation, self).add_to_chat(chat=chat, time=time)
        self.radio_points.append(chat)

    def del_from_chat(self, chat, time):
        super(MapLocation, self).del_from_chat(chat=chat, time=time)
        # info: не нужно делать ездящие города, иначе могут быть проблемы
        self.radio_points.remove(chat)

    def is_available(self, agent, time=None):
        return agent in self.visitors

    @classmethod
    def get_location_by_uri(cls, uri):
        # todo: Устранить метод
        for location in cls.locations:
            if location.example.uri == uri:
                return location

    def on_enter_npc(self, event):
        pass


class Town(MapLocation):
    __str_template__ = '<{self.classname} #{self.id}> => {self.town_name!r}'

    def __init__(self, time, **kw):  # todo: Конструировать на основе example
        super(Town, self).__init__(time=time, **kw)
        self.town_name = self.example.title  # todo: сделать единообразно с радиоточками (там берётся radio_point_name)

        # Инициализация торговца
        # найти торговца в городе
        for npc in set(self.example.get_npc_list()):
            # todo: Спрятать инициализацию NPC в виртуальный метод, чтобы могли инициализироваться все
            if isinstance(npc, Trader) and not options.quick_debug and npc.refresh_time:
                TraderRefreshEvent(time=time, trader=npc, location=self).post()

        self.enemy_agents = dict()  # Должны быть дикты с агентом и временем добавления
        self.enemy_objects = dict()  # Должны быть дикты с объектами и временами добавления
        self.delay_attack = self.example.delay_attack  # Промежуток между атаками
        self.aggro_time = self.example.aggro_time  # Длительность агра города

        self.can_aggro = self.example.get_building_by_type('nukeoil')

    # def on_exit(self, agent, event):
    #     super(Town, self).on_exit(agent=agent, event=event)
    #     # if self.example.trader:
    #     #     InventoryHideMessage(agent=agent, time=event.time, inventory_id=str(self.uid) + '_trader').post()

    def as_dict(self, time, from_message_see=True):
        d = super(Town, self).as_dict(time=time)
        if from_message_see:
            example = self.example
            ex_dict = dict()
            ex_dict['p_enter_range'] = example.p_enter_range
            ex_dict['node_hash'] = example.node_hash()
            d.update(example=ex_dict)
        else:
            d.update(example=self.example.as_client_dict())
        return d

    @classmethod
    def get_towns(cls):
        for location in cls.locations:
            if isinstance(location, Town):
                yield location

    def on_enter_npc(self, event):
        super(Town, self).on_enter_npc(event)
        # todo: Проверить законность входа в переданного NPC в этой локации
        event.agent.on_enter_npc(event=event)

    def can_come(self, agent, time):
        if agent.car and agent.print_login() not in self.enemy_agents:
            distance = self.position(time).distance(agent.car.position(time))
            return agent.car in self.visible_objects and distance < self.example.p_enter_range
        return False

    def can_attack(self):
        return self.can_aggro

    def on_contact_in(self, time, obj):
        super(Town, self).on_contact_in(time=time, obj=obj)
        if self.can_attack():
            if isinstance(obj, ExtraMobile) and obj.example.is_target():  # Мины, дроны, ракеты, радары
                self.need_start_attack(obj=obj, time=time)
            elif isinstance(obj, Unit) and obj.owner:
                if self not in obj.owner.watched_locations:
                    obj.owner.watched_locations.append(self)
                if obj.owner.print_login() in self.enemy_agents:
                    self.need_start_attack(obj=obj, time=time)

    def on_contact_out(self, time, obj):
        super(Town, self).on_contact_out(time=time, obj=obj)
        if not self.can_attack():
            if isinstance(obj, Unit) and obj.owner and self in obj.owner.watched_locations:
                obj.owner.watched_locations.remove(self)

    def on_enemy_candidate(self, agent, damage, time):
        # log.info('{} on_enemy_candidate: {}'.format(self, agent))
        if agent.car and (self.position(time).distance(agent.car.position(time)) < self.example.p_enter_range or damage):
            self.enemy_agents[agent.print_login()] = time + self.aggro_time
            self.need_start_attack(obj=agent.car, time=time)

    def need_start_attack(self, obj, time):
        if obj.uid not in self.enemy_objects:
            self.enemy_objects[obj.uid] = time + self.aggro_time
            self.start_attack(obj=obj, time=time)

    def need_stop_attack(self, obj, agent):
        # log.info('need_stop_attack {} - {}'.format(obj, agent))
        if obj is not None and obj.uid in self.enemy_objects:
            # log.info('stop_attack_obj {}'.format(obj))
            del self.enemy_objects[obj.uid]
        if agent is not None and agent.print_login() in self.enemy_agents:
            # log.info('stop_attack_agent {}'.format(agent))
            del self.enemy_agents[agent.print_login()]

    @event_deco
    def start_attack(self, event, obj):
        # Если было совершено удаление из других мест, то не атаковать
        if obj.uid not in self.enemy_objects:
            return
        # Если объект мёртв или прошло время агра города, то убрать из списка
        if not obj.is_alive or obj.limbo or self.enemy_objects[obj.uid] < event.time:
            self.need_stop_attack(obj=obj, agent=obj.owner)
            return

        # Проверять, не пора ли убирать агента из списка enemy_agents
        if obj.owner and obj.owner.print_login() in self.enemy_agents and self.enemy_agents[obj.owner.print_login()] < event.time:
            self.need_stop_attack(obj=obj, agent=obj.owner)
            return

        # Если не видно объекта, то перестать стрелять по нему
        if obj not in self.visible_objects:
            self.need_stop_attack(obj=obj, agent=None)
            return

        # Запустить эвент на получение дамага ( todo: рассчитать как-то задержку)
        obj_pos = obj.position(event.time)
        delay = 1.5 * self.position(event.time).distance(obj_pos) / self.example.p_observing_range
        self.make_damage(obj=obj, time=event.time + delay)

        # Разослать всем сообщение о начале анимации дамага (старт ракеты-трассера)
        for agent in self.server.agents.values():  # todo: Ограничить круг агентов, получающих уведомление о взрыве, геолокацией.
            TownAttackMessage(agent=agent, town_position=self.position(event.time), target_id=obj.uid,
                              target_pos=obj.position(event.time), time=event.time, duration=delay).post()

        # Запустить эвент на новую атаку
        self.start_attack(time=event.time + self.delay_attack, obj=obj)

    @event_deco
    def make_damage(self, event, obj):
        # log.info('on_make_damage to {}'.format(obj))
        if obj.is_alive and not obj.limbo:  # Нанести дамаг
            dhp_pr = 1.1 if isinstance(obj, ExtraMobile) else 0.05
            obj.set_hp(time=event.time, dhp=dhp_pr * obj.max_hp)


class GasStation(Town):
    @classmethod
    def get_stations(cls):
        for location in cls.locations:
            if isinstance(location, GasStation):
                yield location


class MapRespawn(Observer):
    def on_init(self, event):
        super(MapRespawn, self).on_init(event)
        self.respawn(time=event.time)

    def can_see_me(self, subj, time, obj_pos=None, subj_pos=None):
        return False

    def get_respawn_cls(self, name):
        # todo: сделать правильное получение класса по имени, возможно через реестровые объекты
        from sublayers_server.model import quick_game_power_up as PowerUps
        res = getattr(PowerUps, name, None)
        assert res is not None
        return res

    @event_deco  # если в итоге не подойдёт, то сделать @event_deco_obj и создавать там Objective event
    def respawn(self, event):
        self.respawn(time=event.time + self.example.respawn_time + random.randint(-5, 5))  # создать эвент на новый респавн
        respawn_objects = self.example.respawn_objects
        if not respawn_objects:
            return
        resp_object_proto = random.choice(respawn_objects)
        pos = Point.random_point(self.position(event.time), self.example.respawn_radius)
        # resp_object_ex = resp_object_proto.instantiate()
        # yield resp_object_ex.load_references()
        # log.info('respawn [%s] %s %s %s', self, event.time, resp_object_proto.model_class_name, pos)
        klass = self.get_respawn_cls(resp_object_proto.model_class_name)
        klass(time=event.time, example=resp_object_proto, server=self.server, position=pos)
