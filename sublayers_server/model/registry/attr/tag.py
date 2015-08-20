# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import Attribute


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
