# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.odm import AbstractDocument
from sublayers_server.model.registry.odm.fields import FloatField, EmbeddedDocumentField
from sublayers_server.model.vectors import Point


class PositionField(EmbeddedDocumentField):
    def __init__(self, *args, **kw):
        super(PositionField, self).__init__(embedded_document_type=Position, *args, **kw)

    def set_value(self, value):
        if value is None or isinstance(value, Position):
            return value
        return Position(value)


class Position(AbstractDocument):
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
