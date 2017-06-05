# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.quests import Quest, QuestRange
from sublayers_server.model.registry.classes.quests1 import DeliveryQuestSimple
from sublayers_server.model.registry.odm.fields import (UniReferenceField, ListField, IntField, FloatField,
                                                        EmbeddedDocumentField)
from sublayers_server.model.registry.odm_position import PositionField
from sublayers_server.model.vectors import Point
from sublayers_server.model.registry.tree import Subdoc
import random
from sublayers_server.model.registry.classes import notes


class MarkerMapObject(Subdoc):
    position = PositionField(caption=u"Координаты объекта")
    radius = FloatField(default=50, caption=u"Радиус взаимодействия с объектом", tags='client')

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
    measuring_price = IntField(caption=u'Стоимость одного замера радиации', tags='client')
    measuring_radius = FloatField(caption=u'Максимальный радиус измерения', tags='client')
    measure_points_generator = ListField(
        default=[],
        caption=u"Список областей генерации пунктов замеров",
        base_field=EmbeddedDocumentField(embedded_document_type=MarkerMapObject,
            # embededdo='sublayers_server.model.registry.classes.quests2.MarkerMapObject',
            reinst=True
        ),
        reinst=True
    )
    measure_points = ListField(
        tags='client',
        default=[],
        caption=u"Список выбранных пунктов для замеров",
        base_field=UniReferenceField(
            reference_document_type='sublayers_server.model.registry.classes.quests2.MarkerMapObject'
        ),
        reinst=True,
    )
    measure_count_range = EmbeddedDocumentField(
        embedded_document_type=QuestRange,
        caption=u"Диапазон количетсва измерений",
        reinst=True,
    )
    measure_count = IntField(caption=u'Количество замеров', tags='client')
    measure_notes = ListField(
        default=[],
        caption=u"Список активных нотов маркеров на карте",
        base_field=UniReferenceField(
            reference_document_type='sublayers_server.model.registry.classes.notes.MapMarkerNote'
        ),
        reinst=True,
    )

    def init_measure_points(self):
        self.measure_count = self.measure_count_range.get_random_int()
        for i in range(self.measure_count):
            base_point = random.choice(self.measure_points_generator)
            self.measure_points.append(MarkerMapObject(position=base_point.generate_random_point(),
                                                       radius=self.measuring_radius))

    def deadline_to_str(self):
        m, s = divmod(self.deadline, 60)
        h, m = divmod(m, 60)
        return "%d:%02d:%02d" % (h, m, s)

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
            note_uid = self.agent.add_note(
                quest_uid=self.uid,
                note_class=notes.MapMarkerNote,
                time=event.time,
                marker=marker
            )
            self.measure_notes.append(self.agent.get_note(uid=note_uid))

    def check_notes(self, event):
        if not self.agent._agent_model or not self.agent._agent_model.car:
            return

        temp_notes = self.measure_notes[:]
        for note in temp_notes:
            position = self.agent._agent_model.car.position(time=event.time)
            if note.marker.is_near(position=position):
                self.log(text=u'Произведено измерение.', event=event, position=position)
                self.measure_notes.remove(note)
                self.agent.del_note(uid=note.uid, time=event.time)

    def delete_notes(self, event):
        for note in self.measure_notes:
            self.agent.del_note(uid=note.uid, time=event.time)
        self.measure_notes = []


class DeliveryFromCache(DeliveryQuestSimple):
    design_speed = FloatField(caption=u'Скорость в px/с с которой должен двигаться игрок чтобы успеть (если = 0, то время не ограничено)', default=3)
    cache_radius = FloatField(caption=u'Радиус, в котором можно обнаружить тайник', default=50)

    cache_points_generator = ListField(
        default=[],
        caption=u"Список областей генерации мест для тайника",
        base_field=EmbeddedDocumentField(embedded_document_type=MarkerMapObject, reinst=True),
        reinst=True
    )
    cache_point = EmbeddedDocumentField(embedded_document_type=MarkerMapObject, reinst=True)

    def init_target_point(self):
        base_point = random.choice(self.cache_points_generator)
        self.cache_point = MarkerMapObject(position=base_point.generate_random_point(), radius=self.cache_radius)

    def deadline_to_str(self):
        m, s = divmod(self.deadline, 60)
        h, m = divmod(m, 60)
        return "%d:%02d:%02d" % (h, m, s)

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
