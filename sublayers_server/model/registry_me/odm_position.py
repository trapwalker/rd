# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.vectors import Point

from mongoengine import EmbeddedDocument, EmbeddedDocumentField, FloatField


class PositionField(EmbeddedDocumentField):
    def __init__(self, reinst=True, **kw):
        super(PositionField, self).__init__(document_type=Position, reinst=reinst, **kw)

    def __set__(self, instance, value):
        if value is not None and not isinstance(value, Position):
            value = Position(value)

        super(PositionField, self).__set__(instance, value)

    def set_value(self, value):
        if value is None or isinstance(value, Position):
            return value
        return Position(value)


class Position(EmbeddedDocument):
    x = FloatField()
    y = FloatField()
    # todo: generate qrts index by on_save
    def __init__(self, x=None, y=None, **kw):
        if isinstance(x, Point):
            x, y = x.as_tuple()
        elif isinstance(x, (tuple, list)) and len(x) == 2:
            x, y = x
        super(Position, self).__init__(x=x, y=y, **kw)

    def as_point(self):
        return Point(self.x, self.y)

    def __repr__(self):
        return '{self.__class__.__name__}(x={self.x!r}, y={self.y!r})'.format(self=self)

    def __str__(self):
        return '<{self.x!r}, {self.y!r}>'.format(self=self)
