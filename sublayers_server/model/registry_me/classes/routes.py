# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import (
    Node, Subdoc,
    StringField, IntField, BooleanField, ListField, EmbeddedDocumentField,
    RegistryLinkField, PositionField
)


class Route(Node):
    points = ListField(
        root_default=[],
        caption=u"Маршрут патрулирования",
        field=PositionField(caption=u"Точка патрулирования", reinst=True,),
        reinst=True,
    )

    current_index = IntField(root_default=0, caption=u"Текущий индекс")
    reverse = BooleanField(root_default=False, caption=u"Правила выбора следующей точки")
    cyclic = BooleanField(root_default=False, caption=u"Определяет, является ли маршрут циклическим")
    route_accuracy = IntField(root_default=100, caption=u"Точность подъезда к каждой точки маршрута")

    def get_start_point(self):
        return self.points[-1] if self.reverse else self.points[0]

    def nearest_point(self, position):  # Вызывать при возвращении на маршрут (или при старте маршрута)
        index = self.current_index
        current_distance = None
        iterator = xrange(self.current_index, len(self.points)) if not self.reverse else xrange(len(self.points)-1, self.current_index-1, -1)
        for i in iterator:
            d = position.distance(self.points[i].as_point())
            if current_distance is None or current_distance > d:
                current_distance = d
                index = i
        self.current_index = index
        return self.points[self.current_index].as_point()

    def need_next_point(self, position):
        return position.distance(self.points[self.current_index].as_point()) < self.route_accuracy

    def next_point(self):
        self.current_index += -1 if self.reverse else 1
        route_len = len(self.points)
        if not self.cyclic and (self.current_index < 0 or self.current_index >= route_len):  # Значит маршрут завершён
            return None
        if self.current_index < 0:
            self.current_index = route_len - 1
        if self.current_index >= route_len:
            self.current_index = 0
        return self.points[self.current_index].as_point()