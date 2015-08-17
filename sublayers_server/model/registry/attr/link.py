﻿# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from base import TextAttribute
from sublayers_server.model.registry.uri import URI


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
