# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)


from sublayers_server.model.vectors import Point
from sublayers_server.model.registry.uri import URI


class AttributeError(Exception):
    # todo: detalization
    pass


class Attribute(object):
    def __init__(self, default=None, doc=None, caption=None, tags=None):
        # todo: add param: null
        self.name = None
        self.cls = None
        self.default = default
        self.doc = doc
        self.caption = caption
        if tags is None:
            tags = set()
        elif isinstance(tags, basestring):
            tags = tags.split()

        self.tags = set(tags)

    @property
    def title(self):
        assert self.name, 'Attribute is not attached'
        return self.caption or self.name

    def __str__(self):
        return '{self.__class__.__name__}(name={self.name}, cls={self.cls})'.format(self=self)

    def prepare(self, obj):
        obj._prepared_attrs.add(self.name)

    def from_str(self, s, obj):
        return s

    def from_raw(self, raw, obj):
        return self.from_str(raw, obj) if isinstance(raw, basestring) else raw

    def __get__(self, obj, cls):
        if obj is None:
            return self

        if self.name not in obj._prepared_attrs:
            self.prepare(obj)

        name = self.name
        values = obj.values
        if name in values:
            return values[name]
        parent = obj.parent
        if parent and hasattr(parent, name):
            return getattr(parent, name)
        else:
            return self.default

    def __set__(self, obj, value):
        obj.values[self.name] = value

    def __delete__(self, obj):
        obj._del_attr_value(self.name)

    def attach(self, name, cls):
        self.name = name
        self.cls = cls
        # todo: global attribute registration


class TextAttribute(Attribute):
    pass


class NumericAttribute(Attribute):
    # todo: validation
    def prepare(self, obj):
        value = obj.values.get(self.name)
        if isinstance(value, basestring):
            obj.values[self.name] = self.from_str(value, obj)


class IntAttribute(NumericAttribute):
    # todo: validation
    def from_str(self, s, obj):
        # todo: validation
        try:
            v = int(s)
        except (TypeError, ValueError):
            if s:
                raise ValueError('Wrong value {!r} of {}.{}'.format(s, obj, self.name))
            else:
                v = None
        return v


class FloatAttribute(NumericAttribute):
    def from_str(self, s, obj):
        # todo: validation
        try:
            v = float(s)
        except (TypeError, ValueError):
            if s:
                raise ValueError('Wrong value {!r} of {}.{}'.format(s, obj, self.name))
            else:
                v = None
        return v


# todo: reserved attr names checking


class Parameter(Attribute):
    pass


class Position(Attribute):
    def from_str(self, s, obj):
        # todo: position aliases
        xy = s.split(',')
        assert len(xy) == 2
        # todo: exceptions
        return Point(*map(float, xy))

    def prepare(self, obj):
        super(Position, self).prepare(obj)
        value = obj.values.get(self.name)
        if value is not None and not isinstance(value, Point):
            if isinstance(value, basestring):
                value = self.from_str(value, obj)
            elif isinstance(value, list):
                # todo: Предусмотреть рандомизацию координат за счет опционального третьего аргумента -- дисперсии
                value = Point(*value)
            elif isinstance(value, dict):
                # todo: Предусмотреть рандомизацию координат за счет опционального параметра -- дисперсии (sigma)
                value = Point(**value)
            else:
                raise AttributeError('Wrong value to load Position attribute: {!r}'.format(value))

            if value:
                obj.values[self.name] = value  # todo: optimize


class DocAttribute(TextAttribute):
    def __init__(self):
        super(DocAttribute, self).__init__(caption=u'Описание', doc=u'Описание узла')

    def __get__(self, obj, cls):
        return super(DocAttribute, self).__get__(obj, cls) or self.__doc__
