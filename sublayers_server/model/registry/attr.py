# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.vectors import Point
from sublayers_server.model.registry.uri import URI


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

    def prepare(self, obj):
        pass

    def on_init(self, obj):
        """
        :type obj: sublayers_server.model.registry.tree.Node
        """
        if self.init:
            value = self.init
            if callable(value):
                value = value()
            obj._set_attr_value(self.name, self.to_raw(value, obj))

    def get_raw(self, obj):
        """
        :type obj: sublayers_server.model.registry.tree.Node
        """
        name = self.name
        values = obj.values
        if name in values:
            return values[name]
        parent = obj.parent
        if parent:
            return self.get_raw(parent)
        else:
            return self.default

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
    def __init__(self, default=None, **kw):
        if default is None:
            default = set()
        elif isinstance(default, basestring):
            default = self.from_str(default, None)  # todo: check possible to stay default is raw
        super(TagsAttribute, self).__init__(default=default, **kw)

    def from_str(self, s, obj):
        return set(s.split()) if s else set()

    def __get__(self, obj, cls):
        if obj is None:
            return self
        return self.TagsHolder(attr=self, obj=obj)

    class TagsHolder(object):
        # todo: Заменить на NamedTuple
        def __init__(self, attr, obj):
            """
            @param Attribute attr: Attribute descriptor
            @param sublayers_server.model.registry.tree.Node obj: Node
            """
            self._attr = attr
            self._obj = obj

        def __reduce__(self):
            return set, (list(self.local),)

        @property
        def inherited(self):
            # todo: cache
            obj_parent = self._obj.parent
            name = self._attr.name
            if hasattr(obj_parent, name):
                return getattr(obj_parent, name)
            else:
                return self._attr.default

        @property
        def local(self):
            """
            :return: set
            """
            attr = self._attr
            obj = self._obj
            v = obj.values.get(attr.name)
            if v is None:
                v = set()
            elif isinstance(v, basestring):
                v = attr.from_str(v, obj)
            elif isinstance(v, list):
                v = set(v)

            return v

        @local.setter
        def local(self, value):
            """
            @param set value: new value
            """
            self._obj.values[self._attr.name] = value - self.inherited

        @local.deleter
        def local(self):
            self.local = set()

        @property
        def value(self):
            return self.local | self.inherited

        def add(self, tag):
            local = self.local
            inherited = self.inherited
            if tag not in local and tag not in inherited:
                self.local |= {tag}

        def clear(self):
            del self.local

        def remove(self, tag):
            self.local -= {tag}

        def update(self, tags):
            if isinstance(tags, basestring):
                tags = self._attr.from_str(tags, self._obj)
            self.local |= set(tags)

        def as_str(self, local_only=False):
            return ' '.join(map(str, self.local if local_only else self.value))

        __str__ = as_str

        def __repr__(self):
            return repr(self.value)

        def __iter__(self):
            return iter(self.value)

        def __and__(self, other):
            return self.value & other

        def __or__(self, other):
            return self.value | other

        def __xor__(self, other):
            return self.value ^ other

        def __sub__(self, other):
            return self.value - other

        def __contains__(self, tag):
            return tag in self.value

        def __eq__(self, other):
            return self.value == other

        def __len__(self):
            return len(self.value)

        def __rsub__(self, other):
            return other - self.value

        __ror__ = __or__
        __rxor__ = __xor__
        __rand__ = __and__

        # __iand__ __ior__ __ixor__ __isub__


class TextAttribute(Attribute):
    pass


class NumericAttribute(Attribute):
    # todo: validation
    pass


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
    def to_raw(self, v, obj):
        return None if v is None else v.as_tuple()

    def from_raw(self, data, obj):
        return None if data is None else Point(*data)


class DocAttribute(TextAttribute):
    def __init__(self):
        super(DocAttribute, self).__init__(caption=u'Описание', doc=u'Описание узла')

    def get_raw(self, obj):
        return super(DocAttribute, self).get_raw(obj) or self.__doc__


class RegistryLink(TextAttribute):
    def __init__(self, need_to_instantiate=True, **kw):
        super(RegistryLink, self).__init__(**kw)
        self.need_to_instantiate = need_to_instantiate

    def from_raw(self, raw, obj):
        if raw is None:
            return

        if isinstance(raw, basestring):
            return obj.DISPATCHER.get(URI(raw))

        return raw  # todo: (!!) Убрать неоднозначность

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
        if isinstance(value, basestring):
            value = URI(value)

        if not isinstance(value, URI):
            obj._cache[self.name] = value
        super(RegistryLink, self).__set__(obj, value)


class Slot(RegistryLink):
    LOCK_URI = "reg://registry/items/slot_item/slot_lock"
    def __init__(self, default=LOCK_URI, **kw):
        super(Slot, self).__init__(default=default, **kw)
