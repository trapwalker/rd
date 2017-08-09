# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import (
    Node, Subdoc,
    StringField, IntField, BooleanField, ListField, EmbeddedDocumentField,
    RegistryLinkField, PositionField
)
from sublayers_server.model.utils import get_time
from sublayers_server.model.vectors import Point


class AbstractRoute(Node):
    route_accuracy = IntField(root_default=100, caption=u"Точность подъезда к каждой точки маршрута")

    def get_start_point(self):
        log.error('Call Abstract Method !!!! ')
        pass

    def get_current_point(self):
        pass

    def nearest_point(self, position):  # Вызывать при возвращении на маршрут (или при старте маршрута)
        pass

    def need_next_point(self, position, route_accuracy=None):
        pass

    def next_point(self):
        pass


class Route(AbstractRoute):
    points = ListField(
        root_default=list,
        caption=u"Маршрут патрулирования",
        field=PositionField(caption=u"Точка патрулирования", reinst=True,),
        reinst=True,
    )

    current_index = IntField(root_default=0, caption=u"Текущий индекс")
    reverse = BooleanField(root_default=False, caption=u"Правила выбора следующей точки")
    cyclic = BooleanField(root_default=False, caption=u"Определяет, является ли маршрут циклическим")

    def get_start_point(self):
        return self.points[-1] if self.reverse else self.points[0]

    def get_current_point(self):
        if self.current_index < 0 or self.current_index >= len(self.points):
            return self.get_start_point()
        return self.points[self.current_index].as_point()

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

    def need_next_point(self, position, route_accuracy=None):
        if not self.cyclic and (self.current_index < 0 or self.current_index >= len(self.points)):  # Значит маршрут завершён
            return True  # Чтобы next_point потом вернул None
        route_accuracy = route_accuracy or self.route_accuracy
        return position.distance(self.points[self.current_index].as_point()) < route_accuracy

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


class AreaRandomRoute(AbstractRoute):
    center = PositionField(caption=u"Точка патрулирования")
    _last_current_point = PositionField(caption=u"Последняя выбранная точка")
    dispersion = IntField(root_default=100, caption=u"Разброс рандома")
    _route_start_time = IntField(root_default=0, caption=u"Время старта маршрута")
    route_deadline = IntField(root_default=0, caption=u"Минимальное время на маршруте")

    def get_start_point(self):
        return self.center

    def get_current_point(self):
        return self._last_current_point and self._last_current_point.as_point()

    def nearest_point(self, position):  # Вызывать при возвращении на маршрут (или при старте маршрута)
        self._route_start_time = get_time()
        return self.next_point()

    def need_next_point(self, position, route_accuracy=None):
        route_accuracy = route_accuracy or self.route_accuracy
        return position.distance(self.get_current_point()) < route_accuracy

    def next_point(self):
        if self.route_deadline and get_time() > self._route_start_time + self.route_deadline:
            return None
        self._last_current_point = Point.random_gauss(self.center.as_point(), self.dispersion)
        return self._last_current_point.as_point()


class CompositeRoute(AbstractRoute):
    routes = ListField(
        root_default=list,
        caption=u"Список маршрутов. Начинается с нулевого маршрута. Переключается на следующий только по завершении предыдущего",
        field=EmbeddedDocumentField(document_type=AbstractRoute, caption=u"Маршруты по порядку"),
        reinst=True,
    )

    current_route_index = IntField(root_default=0, caption=u"Индекс текущего маршрута в routes")

    def get_start_point(self):
        return self.routes[self.current_route_index].get_start_point()

    def get_current_point(self):
        if self.current_route_index >= len(self.routes):
            return None
        return self.routes[self.current_route_index].get_current_point()

    def nearest_point(self, position):
        return self.routes[self.current_route_index].nearest_point(position)

    def need_next_point(self, position, route_accuracy=None):
        if self.current_route_index >= len(self.routes):
            return True
        route_accuracy = route_accuracy or self.route_accuracy
        return self.routes[self.current_route_index].need_next_point(position, route_accuracy=route_accuracy)

    def next_point(self):
        routes_len = len(self.routes)
        if self.current_route_index >= routes_len:
            return None
        current_point = self.get_current_point()
        next_p = self.routes[self.current_route_index].next_point()
        if not next_p:
            # Взять следующий маршрут
            self.current_route_index += 1
            if self.current_route_index >= routes_len:
                return None  # Значит мы закончили последний маршрут
            # Инициализация следующего маршрута
            return self.nearest_point(current_point)
        return next_p
