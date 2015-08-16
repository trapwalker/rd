﻿# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.attr import Attribute
from sublayers_server.model.registry import tree
from sublayers_server.model.registry.uri import URI

from itertools import chain


class BaseInventory(list):
    def __init__(self, items=None):
        """
        """
        # todo: проксировать унаследованные части инвентаря так, чтобы прототипы можно было менять
        super(BaseInventory, self).__init__(items or [])

    def prepare(self, value):
        if isinstance(value, basestring):
            return URI(value)
        else:
            return value

    def __getinitargs__(self):
        return list(self)


class ProtoInventory(BaseInventory):
    pass


class Inventory(BaseInventory):
    def __init__(self, items=None):
        """
        """
        # todo: проксировать унаследованные части инвентаря так, чтобы прототипы можно было менять
        super(BaseInventory, self).__init__()
        self.extend(items or [])

    def prepare(self, item):
        item = super(Inventory, self).prepare(item)
        uri = None
        if item is None:
            return
        elif isinstance(item, URI):
            uri = item
            value = tree.Node.DISPATCHER.get(uri)  # todo: exceptions
        else:
            value = item

        if value.abstract and value.can_instantiate:
            uri_params = dict(uri.params or []) if uri else {}
            value = value.instantiate(**uri_params)

        return value


    def __setitem__(self, key, value):
        super(Inventory, self).__setitem__(key, self.prepare(value))

    def append(self, item):
        super(Inventory, self).append(self.prepare(item))

    def extend(self, items):
        for item in items:
            self.append(item)

    def remove(self, item):
        # todo: remove item by parent uri?
        super(Inventory, self).remove(item)

    def sort(self, *av, **kw):
        super(Inventory, self).sort(*av, **kw)

    def __iadd__(self, others):
        for item in others:
            self.append(item)

    def __imul__(self, other):
        raise Exception('Unsupported method')

    #def __contains__  # todo: extended filtering
    #def __repr__
    #def __str__  # todo: Сделать краткое текстовое представление инвентаря для отладки и логов (алиасы прототипов)
    #def count    # todo: подсчет предметов по классам, тегам, префиксам путей в реестре


class InventoryAttribute(Attribute):
    def __init__(self, default=None, **kw):
        assert default is None, 'Default value of InventoryAttribute is not supported'
        super(InventoryAttribute, self).__init__(default=default, **kw)

    # def __set__(self, obj, value):  # todo: do not replace inventory list, but replace goods

    def prepare(self, obj):
        super(InventoryAttribute, self).prepare(obj)
        name = self.name
        values = obj.values

        old_value = values.get(name)
        inherited = getattr(obj.parent, name, [])

        if obj.abstract:
            values[name] = ProtoInventory(items=chain(old_value or [], inherited))
        else:
            if not isinstance(old_value, Inventory):
                values[name] = Inventory(items=chain(old_value or [], inherited))
