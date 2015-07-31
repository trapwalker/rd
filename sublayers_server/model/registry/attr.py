# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.vectors import Point


class Attribute(object):
    def __init__(self, default=None, doc=None, caption=None):
        # todo: add param: null
        self.name = None
        self.cls = None
        self.default = default
        self.doc = doc
        self.caption = caption

    @property
    def title(self):
        assert self.name, 'Attribute is not attached'
        return self.caption or self.name

    def __str__(self):
        return '{self.__class__.__name__}(name={self.name}, cls={self.cls})'.format(self=self)

    def __get__(self, obj, cls):
        value = obj._get_attr_value(self.name, self.default)
        log.debug('__get__ %s.%s() => %s', obj, self.name, value)
        return value

    def __set__(self, obj, value):
        log.debug('__set__ %s.%s = %s', obj, self.name, value)
        obj._set_attr_value(self.name, value)

    def __delete__(self, obj):
        log.debug('__gelete__ %s.%s() => %s', obj, self.name)
        obj._del_attr_value(self.name)

    def attach(self, name, cls):
        self.name = name
        self.cls = cls
        # todo: global attribute registration


# todo: reserved attr names checking

class Parameter(Attribute):
    pass


class Position(Attribute):
    @staticmethod
    def to_ser(v):
        return None if v is None else v.as_tuple()

    @staticmethod
    def from_ser(data):
        return Point(*data)

    def __get__(self, obj, cls):
        data = super(Position, self).__get__(obj, cls)
        return self.from_ser(data)

    def __set__(self, obj, value):
        super(Position, self).__set__(obj, self.to_ser(value))


class DocAttribute(Attribute):
    def __init__(self):
        super(DocAttribute, self).__init__(caption=u'Описание', doc=u'Описание узла')

    def __get__(self, obj, cls):
        default = cls.__doc__
        value = obj._get_attr_value(self.name, self.default or default)  # todo: cascade getter
        return value


class RegistryLink(Attribute):
    def __get__(self, obj, cls):
        if self.name in obj._cache:
            value = obj._cache[self.name]
        else:
            link = super(RegistryLink, self).__get__(obj, cls)
            value = obj.storage.get(link)
            obj._cache[self.name] = value

        return value

    def __set__(self, obj, value):
        obj._cache[self.name] = value
        link = None if value is None else value.uri
        super(RegistryLink, self).__set__(obj, link)


class Slot(RegistryLink):
    LOCK_URI = "reg://registry/items/slot_item/slot_lock"
    def __init__(self, default=LOCK_URI, **kw):
        super(Slot, self).__init__(default=default, **kw)
