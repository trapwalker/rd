# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.poi_loot_objects import CreatePOILootEvent, QuestPrivatePOILoot
from sublayers_server.model.inventory import ItemState
from sublayers_server.model.vectors import Point
from sublayers_server.model.registry_me.classes.quests import Quest, QuestRange
from sublayers_server.model.registry_me.classes.quests1 import DeliveryQuestSimple
from sublayers_server.model.registry_me.tree import (
    Subdoc,    
    StringField, ListField, IntField, FloatField, EmbeddedDocumentField, DateTimeField,
    EmbeddedNodeField, PositionField,
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
            document_type='sublayers_server.model.registry.classes.quests2.MarkerMapObject'
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
            document_type='sublayers_server.model.registry.classes.notes.MapMarkerNote'
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
            self.reward_karma
        )

    def init_notes(self, event):
        for marker in self.measure_points:
            note_uid = self.agent.profile.add_note(
                quest_uid=self.uid,
                note_class=notes.MapMarkerNote,
                time=event.time,
                marker=marker
            )
            self.measure_notes.append(self.agent.profile.get_note(uid=note_uid))

    def check_notes(self, event):
        if not self.agent.profile._agent_model or not self.agent.profile._agent_model.car:
            return

        temp_notes = self.measure_notes[:]
        for note in temp_notes:
            position = self.agent.profile._agent_model.car.position(time=event.time)
            if note.marker.is_near(position=position):
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
        self.text_short = u"Привезите вещи из тайника."
        self.text = u"Привезите {} вещей из тайника {}. Награда: {:.0f}nc и {:.0f} кармы.".format(
            len(self.delivery_set),
            u"" if not self.deadline else u" за {}".format(self.deadline_to_str()),
            self.reward_money,
            self.reward_karma
        )

    def create_poi_container(self, event):
        if self.deadline:
            life_time = self.starttime + self.deadline - event.time
        else:
            life_time = event.server.poi_loot_objects_life_time
        private_name = self.agent.profile._agent_model and self.agent.profile._agent_model.print_login() or self.agent.login

        items = []
        for item_example in self.delivery_set:
            item = item_example.instantiate(amount=item_example.amount)
            items.append(ItemState(server=event.server, time=event.time, example=item, count=item.amount))

        CreatePOILootEvent(
            server=event.server,
            time=event.time,
            poi_cls=QuestPrivatePOILoot,
            example=None,
            inventory_size=len(self.delivery_set),
            position=Point.random_gauss(self.cache_point.position.as_point(), self.cache_point.radius),
            life_time=life_time,
            items=items,
            connect_radius=0,
            extra=dict(private_name=private_name),
        ).post()


# todo: rename to MapActivateItemQuest
class MapActivateItem(Quest):
    activate_price = IntField(caption=u'Стоимость одной активации итема', tags={'client'})
    activate_radius = FloatField(caption=u'Максимальный радиус активации', tags={'client'})

    activate_points_generator = ListField(
        default=[],
        caption=u"Список областей генерации пунктов замеров",
        field=EmbeddedDocumentField(document_type=MarkerMapObject, reinst=True),
        reinst=True
    )
    activate_points = ListField(
        default=[],
        caption=u"Список областей генерации пунктов замеров",
        field=EmbeddedDocumentField(document_type=MarkerMapObject, reinst=True),
        reinst=True
    )

    activate_items_generator = ListField(
        caption=u"Список возможных итемов для активации",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry.classes.item.Item',
            caption=u"Необходимый итем",
            reinst=True,
            tags={'client'},
        )
    )
    activate_items = ListField(
        caption=u"Список итемов для доставки",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry.classes.item.Item',
            caption=u"Необходимый итем",
            reinst=True,
            tags={'client'},
        ),
    )

    activate_notes = ListField(
        default=[],
        caption=u"Список активных нотов маркеров на карте",
        field=EmbeddedDocumentField(
            document_type='sublayers_server.model.registry.classes.notes.MapMarkerNote'
        ),
        reinst=True,
    )

    def init_activate_items(self):
        self.activate_items = []
        choice = random.choice(self.activate_items_generator)
        item = choice.instantiate(amount=choice.amount)
        self.activate_items.append(item)

    def init_activate_points(self):
        self.activate_points = []
        base_point = random.choice(self.activate_points_generator)
        self.activate_points.append(MarkerMapObject(position=base_point.generate_random_point(),
                                                    radius=self.activate_radius))

    def init_distance(self):
        p1 = self.hirer.hometown.position.as_point()
        p2 = self.activate_points[0].position.as_point()
        return p1.distance(p2) * 2  #  дистация двойная, так как нужно съездить туда и обратно

    def init_deadline(self, distance):
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
        note_uid = self.agent.profile.add_note(
            quest_uid=self.uid,
            note_class=notes.MapMarkerNote,
            time=event.time,
            marker=self.activate_points[0]
        )
        self.activate_notes.append(self.agent.profile.get_note(uid=note_uid))

    def check_notes(self, event):
        if not self.agent.profile._agent_model or not self.agent.profile._agent_model.car:
            return

        temp_notes = self.activate_notes[:]
        for note in temp_notes:
            position = self.agent.profile._agent_model.car.position(time=event.time)
            if note.marker.is_near(position=position):
                self.log(text=u'Произведена активация.', event=event, position=position)
                self.activate_notes.remove(note)
                self.agent.profile.del_note(uid=note.uid, time=event.time)

    def check_item(self, item):
        return self.activate_items[0].node_hash() == item.node_hash()

    def delete_notes(self, event):
        for note in self.activate_notes:
            self.agent.profile.del_note(uid=note.uid, time=event.time)
        self.activate_notes = []