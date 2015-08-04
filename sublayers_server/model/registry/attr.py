# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.vectors import Point


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

    def get_raw(self, obj):
        value = obj._get_attr_value(self.name, self.default)
        return value

    def from_str(self, s, obj):
        return s

    def from_raw(self, raw, obj):
        return raw

    def to_raw(self, value, obj):
        return value

    def __get__(self, obj, cls):
        if obj is None:
            return self
        return self.from_raw(self.get_raw(obj), obj)

    def __set__(self, obj, value):
        obj._set_attr_value(self.name, self.to_raw(value, obj))

    def __delete__(self, obj):
        obj._del_attr_value(self.name)

    def attach(self, name, cls):
        self.name = name
        self.cls = cls
        # todo: global attribute registration


# todo: reserved attr names checking

class Parameter(Attribute):
    pass


class Position(Attribute):
    def to_raw(self, v, obj):
        return None if v is None else v.as_tuple()

    def from_raw(self, data, obj):
        return Point(*data)


class DocAttribute(Attribute):
    def __init__(self):
        super(DocAttribute, self).__init__(caption=u'Описание', doc=u'Описание узла')

    def get_raw(self, obj):
        return obj._get_attr_value(self.name, self.default or self.__doc__)


class RegistryLink(Attribute):
    def __init__(self, need_to_instantiate=True, **kw):
        super(RegistryLink, self).__init__(**kw)
        self.need_to_instantiate = need_to_instantiate

    def from_raw(self, raw, obj):
        return obj.storage.get(raw) if raw else None

    def to_raw(self, value, obj):
        return None if value is None else value.uri

    def __get__(self, obj, cls):
        if obj is None:
            return self
        if self.name in obj._cache:
            value = obj._cache[self.name]
        else:
            link = self.get_raw(obj)
            value = self.from_raw(link, obj)
            obj._cache[self.name] = value

        return value

    def __set__(self, obj, value):
        obj._cache[self.name] = value
        super(RegistryLink, self).__set__(obj, value)


class Slot(RegistryLink):
    LOCK_URI = "reg://registry/items/slot_item/slot_lock"
    def __init__(self, default=LOCK_URI, **kw):
        super(Slot, self).__init__(default=default, **kw)
