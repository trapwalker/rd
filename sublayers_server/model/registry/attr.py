# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.vectors import Point


class Attribute(object):
    def __init__(self, default=None, init=None, doc=None, caption=None, tags=None):
        # todo: add param: null
        self.name = None
        self.cls = None
        self.default = default
        self.init = init
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

    def on_init(self, obj):
        if self.init:
            value = self.init
            if callable(value):
                value = value()
            obj._set_attr_value(self.name, self.to_raw(value, obj))

    def get_raw(self, obj):
        value = obj._get_attr_value(self.name, self.default)
        return value

    def from_str(self, s, obj):
        return s

    def from_raw(self, raw, obj):
        return self.from_str(raw, obj) if isinstance(raw, basestring) else raw

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


class TagsAttribute(Attribute):
    class TagsHolder(object):
        def __init__(self, attr, obj, cls):
            """
            @param Attribute attr: Attribute descriptor
            @param sublayers_server.model.registry.tree.Node obj: Node
            @param type cls: Class of node
            """
            self._attr = attr
            self._obj = obj
            self._cls = cls

        @property
        def inherited(self):
            # todo: cache
            obj_parent = self._obj.parent
            return getattr(obj_parent, self._attr.name, set()) if obj_parent else set()

        @property
        def local(self):
            """
            :return: set
            """
            return self._obj.values.get(self._attr.name, set())

        @local.setter
        def local(self, value):
            """
            @param set value: new value
            """
            self._obj.values[self._attr.name] = value - self.inherited

        @property
        def value(self):
            return self.local + self.inherited

        def add(self, tag):
            local = self.local
            inherited = self.inherited
            if tag not in local and tag not in inherited:
                self.local |= {tag}

        def clear(self):
            self.local = set()

        def remove(self, tag):
            self.local -= {tag}

        def update(self, tags):
            self.local |= tags

        def __and__(self, other):
            return self.value & other

        def __contains__(self, tag):
            return tag in self.value
            
        #__eq__
        #__iand__?
        #__ior__
        #__ixor__
        #__isub__
        #__iter__
        #__len__
        #__or__
        #__ror__
        #__rsub__
        #__rxor__
        #__rand__
        #__reduce__
        #__repr__
        #__sub__
        #__xor__

    def __get__(self, obj, cls):
        return self.TagsHolder(attr=self, obj=obj, cls=cls)




class TextAttribute(Attribute):
    pass


# class TagsAttribute(Attribute):
#     # todo: validation
#     def from_str(self, s, obj):
#         if s is None:
#             return set()
#
#         s = s.strip()
#         if s and s[0] == '[' and s[-1] == ']':
#             s = s[1:-1]
#             tags = [tag.strip() for tag in s.split(',')]
#         else:
#             tags = s.split()
#         return set(tags)
#
#     def from_raw(self, raw, obj):
#         return self.from_str(raw, obj) if raw is None or isinstance(raw, basestring) else raw
#
#     # def to_raw(self, value, obj):
#     #     return list(value)


class NumericAttribute(Attribute):
    # todo: validation
    pass


class IntAttribute(NumericAttribute):
    # todo: validation
    def from_str(self, s, obj):
        # todo: validation
        try:
            v = int(s)
        except:
            if s:
                raise ValueError('Wrong value of {}.{}'.format(obj, self.name))
            else:
                v = None
        return v


class FloatAttribute(NumericAttribute):
    def from_str(self, s, obj):
        # todo: validation
        try:
            v = float(s)
        except:
            if s:
                raise ValueError('Wrong value of {}.{}'.format(obj, self.name))
            else:
                v = None
        return v


# todo: reserved attr names checking


class InventoryAttribute(Attribute):
    pass


class Parameter(Attribute):
    pass


class Position(Attribute):
    def to_raw(self, v, obj):
        return None if v is None else v.as_tuple()

    def from_raw(self, data, obj):
        return None if data is None else Point(*data)


class DocAttribute(TextAttribute):
    def __init__(self):
        super(DocAttribute, self).__init__(caption=u'Описание', doc=u'Описание узла')

    def get_raw(self, obj):
        return obj._get_attr_value(self.name, self.default or self.__doc__)


class RegistryLink(TextAttribute):
    def __init__(self, need_to_instantiate=True, **kw):
        super(RegistryLink, self).__init__(**kw)
        self.need_to_instantiate = need_to_instantiate

    def from_raw(self, raw, obj):
        if raw is None:
            return

        return obj.DISPATCHER.get(raw) if isinstance(raw, basestring) else raw

    def to_raw(self, value, obj):
        if value is None or isinstance(value, basestring):
            return value

        return value.uri or value

    def __get__(self, obj, cls):
        if obj is None:
            return self

        if self.name in obj._cache:
            value = obj._cache[self.name]
        else:
            value = super(RegistryLink, self).__get__(obj, cls)
            obj._cache[self.name] = value

        return value

    def __set__(self, obj, value):
        if not isinstance(value, basestring):
            obj._cache[self.name] = value
        super(RegistryLink, self).__set__(obj, value)


class Slot(RegistryLink):
    LOCK_URI = "reg://registry/items/slot_item/slot_lock"
    def __init__(self, default=LOCK_URI, **kw):
        super(Slot, self).__init__(default=default, **kw)
