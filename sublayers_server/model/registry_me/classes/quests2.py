# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.poi_loot_objects import CreatePOILootEvent, CreatePOICorpseEvent, QuestPrivatePOILoot
from sublayers_server.model.inventory import ItemState
from sublayers_server.model.vectors import Point
from sublayers_server.model.registry_me.classes.quests import Quest, QuestRange
from sublayers_server.model.registry_me.classes.quests1 import DeliveryQuestSimple
from sublayers_server.model.registry_me.tree import (
    Subdoc, ListField, IntField, FloatField, EmbeddedDocumentField, EmbeddedNodeField, PositionField, UUIDField,
)
from sublayers_server.model.registry_me.classes import notes

import random


class MarkerMapObject(Subdoc):
    position = PositionField(caption=u"Координаты объекта")
    radius = FloatField(default=50, caption=u"Радиус взаимодействия с объектом", tags={'client'})

    def is_near(self, position):
        if isinstance(position, PositionField):
            position = position.as_point()
        if isinstance(position, Point):
            distance = self.position.as_point().distance(target=position)
            return distance <= self.radius
        return False

    def generate_random_point(self):
        return Point.random_point(p=self.position.as_point(), radius=self.radius)

    def as_client_dict(self):
        d = super(MarkerMapObject, self).as_client_dict()
        d.update(position=self.position.as_point())
        return d


class MeasureRadiation(Quest):
    measuring_price = IntField(caption=u'Стоимость одного замера радиации', tags={'client'})
    measuring_radius = FloatField(caption=u'Максимальный радиус измерения', tags={'client'})
    measure_points_generator = ListField(
        default=[],
        caption=u"Список областей генерации пунктов замеров",
        field=EmbeddedDocumentField(document_type=MarkerMapObject, reinst=True),
        reinst=True
    )
    measure_points = ListField(
        tags={'client'},
        default=[],
        caption=u"Список выбранных пунктов для замеров",
        field=EmbeddedDocumentField(
            document_type='sublayers_server.model.registry_me.classes.quests2.MarkerMapObject'
        ),
        reinst=True,
    )
    measure_count_range = EmbeddedDocumentField(
        document_type=QuestRange,
        caption=u"Диапазон количетсва измерений",
        reinst=True,
    )
    measure_count = IntField(caption=u'Количество замеров', tags={'client'})
    measure_notes = ListField(
        default=[],
        caption=u"Список активных нотов маркеров на карте",
        field=EmbeddedDocumentField(
            document_type='sublayers_server.model.registry_me.classes.notes.MapMarkerNote'
        ),
        reinst=True,
    )

    def init_measure_points(self):
        self.measure_count = self.measure_count_range.get_random_int()
        for i in range(self.measure_count):
            base_point = random.choice(self.measure_points_generator)
            self.measure_points.append(MarkerMapObject(position=base_point.generate_random_point(),
                                                       radius=self.measuring_radius))

    def init_deadline(self):
        if self.deadline:
            all_time = self.measure_count * self.deadline
            # Время выделенное на квест кратно 5 минутам
            self.deadline = (all_time / 300) * 300 + (300 if (all_time % 300) > 0 else 0)

    def init_text(self):
        self.text_short = u"Обследуйте {:.0f} точек.".format(self.measure_count)
        self.text = u"Замерьте уровень радиации в {:.0f} точек{}. Награда: {:.0f}nc и {:.0f} кармы.".format(
            self.measure_count,
            u"" if not self.deadline else u" за {}".format(self.deadline_to_str()),
            self.reward_money,
            self.reward_karma,
        )

    def init_notes(self, event):
        for marker in self.measure_points:
            note_uid = self.agent.profile.add_note(
                quest_uid=self.uid,
                note_class=notes.MapMarkerNote,
                time=event.time,
                position=marker.position,
                radius=marker.radius,
            )
            self.measure_notes.append(self.agent.profile.get_note(uid=note_uid))

    def check_notes(self, event):
        if not self.agent.profile._agent_model or not self.agent.profile._agent_model.car:
            return

        temp_notes = self.measure_notes[:]
        for note in temp_notes:
            position = self.agent.profile._agent_model.car.position(time=event.time)
            if note.is_near(position=position):
                self.log(text=u'Произведено измерение.', event=event, position=position)
                self.measure_notes.remove(note)
                self.agent.profile.del_note(uid=note.uid, time=event.time)

    def delete_notes(self, event):
        for note in self.measure_notes:
            self.agent.profile.del_note(uid=note.uid, time=event.time)
        self.measure_notes = []


class DeliveryFromCache(DeliveryQuestSimple):
    cache_radius = FloatField(caption=u'Радиус, в котором можно обнаружить тайник', root_default=50)

    cache_points_generator = ListField(
        root_default=[],
        caption=u"Список областей генерации мест для тайника",
        field=EmbeddedDocumentField(document_type=MarkerMapObject, reinst=True),
        reinst=True,
    )
    cache_point = EmbeddedDocumentField(document_type=MarkerMapObject, reinst=True)

    loot_set_list = ListField(
        root_default=[],
        caption=u"Список возможных комплектов ненужных вещей",
        field=ListField(
            caption=u"Комплект ненужных вещей",
            field=EmbeddedNodeField(
                document_type='sublayers_server.model.registry_me.classes.item.Item',
                caption=u"Необходимый итем",
            ),
        ),
        reinst=True,
    )
    loot_set = ListField(
        caption=u"Список ненужных вещей",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.item.Item',
            caption=u"Необходимый итем",
        ),
    )

    def init_level(self):
        self.level = 1

    def generate_reward(self):
        self.reward_money = 0
        self.reward_karma = 2
        self.reward_relation_hirer = 5

    def init_delivery_set(self):
        # Тут гененрация посылок
        self.delivery_set = []
        # Выбор только по первому элементу списка (т.к. в простой реализации квеста естьтолько список итемов а не пресеты)
        choice = random.choice(self.delivery_set_list[0])
        item = choice.instantiate(amount=choice.amount)
        self.delivery_set.append(item)

        # Тут гененрация ненужных вещей
        self.loot_set = []
        for i in range(random.choice([3, 4])): # 3-4 предмета
            # Выбор только по первому элементу списка (т.к. в простой реализации квеста естьтолько список итемов а не пресеты)
            choice = random.choice(self.loot_set_list[0])
            item = choice.instantiate(amount=choice.amount)
            self.loot_set.append(item)

    def init_target_point(self):
        base_point = random.choice(self.cache_points_generator)
        self.cache_point = MarkerMapObject(position=base_point.generate_random_point(), radius=self.cache_radius)

    def init_distance(self):
        p1 = self.hirer.hometown.position.as_point()
        p2 = self.cache_point.position.as_point()
        return p1.distance(p2) * 2  # дистация двойная, так как нужно съездить туда и обратно

    def init_deadline(self, distance):
        # Время выделенное на квест в секундах
        if self.design_speed:
            all_time = int(distance / self.design_speed)
            # Время выделенное на квест кратно 5 минутам
            self.deadline = (all_time / 300) * 300 + (300 if (all_time % 300) > 0 else 0)
        else:
            self.deadline = 0

    def init_text(self):
        self.text_short = u"Найти пропавшую посылку."
        self.text = u"Вернуть пропавшую посылку.{} Награда: {:.0f}nc и {:.0f} кармы.".format(
            u"." if not self.deadline else u" за {}.".format(self.deadline_to_str()),
            self.reward_money,
            self.reward_karma,
        )

    def create_poi_container(self, event):
        if self.deadline:
            life_time = self.starttime + self.deadline - event.time
        else:
            life_time = event.server.poi_loot_objects_life_time
        private_name = self.agent.profile._agent_model and self.agent.profile._agent_model.print_login() or self.agent.login

        items = []
        for item_example in self.delivery_set:
            # item = item_example.instantiate(amount=item_example.amount)
            items.append(ItemState(server=event.server, time=event.time, example=item_example, count=item_example.amount))
        for item_example in self.loot_set:
            # item = item_example.instantiate(amount=item_example.amount)
            items.append(ItemState(server=event.server, time=event.time, example=item_example, count=item_example.amount))

        CreatePOILootEvent(
            server=event.server,
            time=event.time,
            poi_cls=QuestPrivatePOILoot,
            example=None,
            inventory_size=len(self.delivery_set) + len(self.loot_set),
            position=Point.random_gauss(self.cache_point.position.as_point(), self.cache_point.radius),
            life_time=life_time,
            items=items,
            connect_radius=0,
            extra=dict(private_name=private_name),
        ).post()

    def can_take_items_uid(self, items, event):
        if not self.agent.profile.car:
            return False
        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.inventory.save_to_example(time=event.time)
        for item_need in items:
            if not item_need in self.agent.profile.car.inventory.items:
                return False
        return True

    def take_items_uid(self, items, event):
        if not self.can_take_items_uid(items=items, event=event):
            return False
        copy_inventory = self.agent.profile.car.inventory.items[:]
        for item in copy_inventory:
            self.agent.profile.car.inventory.items.remove(item)
        if self.agent.profile._agent_model:
            self.agent.profile._agent_model.reload_inventory(time=event.time, save=False)
        return True


class MapActivateItemQuest(Quest):
    activate_price = IntField(caption=u'Стоимость одной активации итема', tags={'client'})
    activate_radius = FloatField(caption=u'Максимальный радиус активации', tags={'client'})

    activate_points_generator = ListField(
        default=[],
        caption=u"Список областей генерации пунктов замеров",
        field=EmbeddedDocumentField(document_type=MarkerMapObject),
        reinst=True,
    )
    activate_points = ListField(
        default=[],
        caption=u"Список областей генерации пунктов замеров",
        field=EmbeddedDocumentField(document_type=MarkerMapObject),
        reinst=True,
    )

    activate_items_generator = ListField(
        caption=u"Список возможных итемов для активации",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.item.Item',
            caption=u"Необходимый итем",
            reinst=True,
            tags={'client'},
        )
    )
    activate_items = ListField(
        caption=u"Список итемов для доставки",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.item.Item',
            caption=u"Необходимый итем",
            reinst=True,
            tags={'client'},
        ),
    )

    activate_notes = ListField(
        default=[],
        caption=u"Список активных нотов маркеров на карте",
        field=UUIDField(),
        reinst=True,
    )

    def init_activate_points(self):
        self.activate_points = []
        for i in range(0, random.randint(2, 6)):
            base_point = random.choice(self.activate_points_generator)
            self.activate_points.append(MarkerMapObject(position=base_point.generate_random_point(),
                                                    radius=self.activate_radius))

    def init_activate_items(self):
        self.activate_items = []
        choice = random.choice(self.activate_items_generator)
        need_count = len(self.activate_points)
        count = 0
        while count < need_count:
            amount = min(choice.stack_size, need_count - count)
            count += amount
            if amount:
                item = choice.instantiate(amount=amount)
                self.activate_items.append(item)

    def init_distance(self):
        p1 = self.hirer.hometown.position.as_point()
        p2 = self.activate_points[0].position.as_point()
        return p1.distance(p2) * 2  #  дистация двойная, так как нужно съездить туда и обратно

    def init_deadline(self, distance=0):
        # Время выделенное на квест в секундах
        if self.design_speed:
            all_time = int(distance / self.design_speed)
            # Время выделенное на квест кратно 5 минутам
            self.deadline = (all_time / 300) * 300 + (300 if (all_time % 300) > 0 else 0)
        else:
            self.deadline = 0

    def init_text(self):
        self.text_short = u"Активируйте предметы в заданных точках."
        self.text = u"Активируйте предметы: {} - в заданных точках. Награда: {:.0f}nc.".format(
            ', '.join([item.title for item in self.activate_items]),
            self.reward_money
        )

    def init_notes(self, event):
        for point in self.activate_points:
            note_uid = self.agent.profile.add_note(
                quest_uid=self.uid,
                note_class=notes.MapMarkerNote,
                time=event.time,
                position=point.position,
                radius=point.radius,
            )
            self.activate_notes.append(note_uid)

    def check_notes(self, event):
        if not self.agent.profile._agent_model or not self.agent.profile._agent_model.car:
            return

        temp_notes = self.activate_notes[:]
        for note_uid in temp_notes:
            note = self.agent.profile.get_note(note_uid)
            if note:
                position = self.agent.profile._agent_model.car.position(time=event.time)
                if note.is_near(position=position):
                    self.log(text=u'Произведена активация.', event=event, position=position)
                    self.activate_notes.remove(note_uid)
                    self.agent.profile.del_note(uid=note_uid, time=event.time)
                    return # Если вдруг позиции рядом, чтобы не засчиталась одна активация нескольким нотам

    def check_item(self, item):
        return self.activate_items[0].node_hash() == item.node_hash()

    def delete_notes(self, event):
        for note_uid in self.activate_notes:
            self.agent.profile.del_note(uid=note_uid, time=event.time)
        self.activate_notes = []


class MapActivateRadarsQuest(MapActivateItemQuest):
    def init_distance(self):
        return 0

    def init_deadline(self):
        self.deadline = len(self.activate_points) * 3600  # По часу на точку

    def init_text(self):
        self.text_short = u"Установить наблюдательные зонды."
        self.text = u"Установите в заданных точках наблюдательные зонды в количестве: {}. Награда: {:.0f}nc.".format(
            len(self.activate_points),
            self.reward_money
        )

    def generate_reward(self):
        self.reward_money = self.activate_price * len(self.activate_points)
        self.reward_karma = 1


class SearchCourier(DeliveryFromCache):
    cache_radius = FloatField(caption=u'Радиус, в котором можно обнаружить тайник', root_default=50)

    loot_set_list = ListField(
        root_default=[],
        caption=u"Список возможных комплектов ненужных вещей",
        field=ListField(
            caption=u"Комплект ненужных вещей",
            field=EmbeddedNodeField(
                document_type='sublayers_server.model.registry_me.classes.item.Item',
                caption=u"Необходимый итем",
            ),
        ),
        reinst=True,
    )
    loot_set = ListField(
        caption=u"Список ненужных вещей",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.item.Item',
            caption=u"Необходимый итем",
        ),
    )

    courier_car_list = ListField(
        caption=u"Список возможных машин курьера",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.mobiles.Car',
            caption=u"Машина курьера",
        ),
    )
    courier_car = EmbeddedNodeField(
        document_type='sublayers_server.model.registry_me.classes.mobiles.Car',
        caption=u"Машина курьера",
    )

    courier_medallion = EmbeddedNodeField(
        document_type='sublayers_server.model.registry_me.classes.quest_item.QuestItem',
        caption=u"Медальон курьера",
        tags={'client'},
    )

    def init_delivery_set(self):
        self.delivery_set = []

        # Тут гененрация ненужных вещей
        self.loot_set = []
        for i in range(random.choice([3, 4])): # 3-4 предмета
            # Выбор только по первому элементу списка (т.к. в простой реализации квеста естьтолько список итемов а не пресеты)
            choice = random.choice(self.loot_set_list[0])
            item = choice.instantiate(amount=choice.amount)
            self.loot_set.append(item)

        # Выбор машинки курьера
        choice = random.choice(self.courier_car_list)
        self.courier_car = choice.instantiate()

    def init_text(self):
        self.text_short = u"Найти пропавшего курьера."
        self.text = u"Найти пропавшего курьера и вернуть важный предмет{} Награда: {:.0f}nc и {:.0f} кармы.".format(
            u"." if not self.deadline else u" за {}.".format(self.deadline_to_str()),
            self.reward_money,
            self.reward_karma,
        )

    def create_poi_container(self, event):
        if self.deadline:
            life_time = self.starttime + self.deadline - event.time
        else:
            life_time = event.server.poi_loot_objects_life_time
        private_name = self.agent.profile._agent_model and self.agent.profile._agent_model.print_login() or self.agent.login

        items = []
        for item_example in self.delivery_set:
            # item = item_example.instantiate(amount=item_example.amount)
            items.append(ItemState(server=event.server, time=event.time, example=item_example, count=item_example.amount))
        for item_example in self.loot_set:
            # item = item_example.instantiate(amount=item_example.amount)
            items.append(ItemState(server=event.server, time=event.time, example=item_example, count=item_example.amount))


        self.agent.profile.quest_inventory.add_item(agent=self.agent, item=self.courier_medallion, event=event)
        self.log(text=u'Получена платиновая фишка.', event=event, position=self.cache_point.position)

        CreatePOICorpseEvent(
            server=event.server,
            time=event.time,
            example=None,
            inventory_size=len(self.loot_set),
            position=self.cache_point.position.as_point(),
            life_time=life_time,
            items=items,
            sub_class_car=self.courier_car.sub_class_car,
            car_direction=0,
            donor_v=0,
            donor_example=self.courier_car,
            agent_viewer=None,
        ).post()

    def take_medallion(self, event):
        self.agent.profile.quest_inventory.del_item(agent=self.agent, item=self.courier_medallion, event=event)
        return True