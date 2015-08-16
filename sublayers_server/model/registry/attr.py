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

        if self.name not in obj._prepared_attrs:
            self.prepare(obj)

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


class RegistryLink(TextAttribute):
    def __init__(self, need_to_instantiate=True, **kw):
        super(RegistryLink, self).__init__(**kw)
        self.need_to_instantiate = need_to_instantiate

    def prepare(self, obj):
        super(RegistryLink, self).prepare(obj)
        if self.name in obj.values:
            raw = obj.values.get(self.name)
        elif obj.parent and hasattr(obj.parent, self.name):
            raw = getattr(obj.parent, self.name)
        else:
            raw = self.default

        if raw is None:
            return
        elif isinstance(raw, basestring):
            raw = URI(raw)
            obj.values[self.name] = raw
        # todo: Валидировать нестроковое значение в абстрактном объекте

        if obj.abstract or obj.storage and obj.storage.name == 'registry':
            return

        from sublayers_server.model.registry.tree import Node  # todo: optimize

        uri_params = {}
        if isinstance(raw, URI):
            uri_params = dict(raw.params or [])
            linked_node = obj.DISPATCHER.get(raw)  # todo: exceptions
        elif isinstance(raw, Node):
            linked_node = raw
        else:
            raise AttributeError('Wrong attribute raw value type: {obj.__class__.__name__}.{attr.name}{raw!r}'.format(
                obj=obj, attr=self, raw=raw))

        if self.need_to_instantiate and linked_node.can_instantiate and linked_node.abstract:
            value = linked_node.instantiate(owner=obj, **uri_params)
            obj.values[self.name] = None if value is None else (value.uri or value)
        # todo: закешировать неинстанцируемый нод

    def __get__(self, obj, cls):
        if obj is None:
            return self

        if self.name not in obj._prepared_attrs:
            self.prepare(obj)

        if self.name in obj._cache:
            value = obj._cache[self.name]
        elif self.name in obj.values:
            value = obj.values.get(self.name)
            assert not isinstance(value, basestring)
        elif hasattr(obj.parent, self.name):
            value = getattr(obj.parent, self.name)
        else:
            value = self.default
            assert not isinstance(value, basestring)

        if isinstance(value, URI):  # todo: Проверить схему URI, возможно ресурс доставать не из реестра
            value = obj.DISPATCHER.get(value)
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
