﻿# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

#from sublayers_server.model.registry.attr import Attribute
from base import Attribute
from sublayers_server.model.registry import tree
from sublayers_server.model.registry.uri import URI

from itertools import chain
from collections import Counter


class BaseInventory(list):
    def __init__(self, items=None):
        """
        """
        # todo: проксировать унаследованные части инвентаря так, чтобы прототипы можно было менять
        super(BaseInventory, self).__init__()
        self.extend(items or [])

    def prepare(self, value):
        # todo: прототип инвентаря после подготовки должен состоянть из URI, а не из строк
        if isinstance(value, basestring):
            return URI(value)
        else:
            return value

    def __getinitargs__(self):
        return list(self)

    def __setitem__(self, key, value):
        super(BaseInventory, self).__setitem__(key, self.prepare(value))

    def append(self, item):
        super(BaseInventory, self).append(self.prepare(item))

    def extend(self, items):
        for item in items:
            self.append(item)

    def remove(self, item):
        # todo: remove item by parent uri?
        super(BaseInventory, self).remove(item)

    def sort(self, *av, **kw):
        super(BaseInventory, self).sort(*av, **kw)

    def __iadd__(self, others):
        for item in others:
            self.append(item)

    def __imul__(self, other):
        raise Exception('Unsupported method')

    #def __contains__  # todo: extended filtering
    #def __repr__
    #def __str__  # todo: Сделать краткое текстовое представление инвентаря для отладки и логов (алиасы прототипов)
    #def count    # todo: подсчет предметов по классам, тегам, префиксам путей в реестре


class ProtoInventory(BaseInventory):
    def get_item_by_uri(self, item_uri_str):
        for item in self:
            if str(item) == item_uri_str:
                return item
        return None


class Inventory(BaseInventory):

    def placing(self):
        u"""Расстановка неустановленных и расставленых с коллизией предметов по свободным ячейкам инвентаря"""
        positions = Counter((item.position for item in self if item.position is not None))
        i = 0
        for item in self:
            while positions[i]:
                i += 1
            if item.position is None or positions[item.position] > 1:
                if item.position is not None:
                    positions[item.position] -= 1
                item.position = i
                i += 1

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

    def get_item_by_id(self, item_id_str):
        for item in self:
            if item.id == item_id_str:
                return item
        return None

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
        inherited = self.get_ex(obj.parent, obj.parent.__class__) if hasattr(obj.parent, self.name) else []  # todo: fixit

        if obj.abstract or obj.storage and obj.storage.name == 'registry':
            values[name] = ProtoInventory(items=chain(old_value or [], inherited))
        else:
            if not isinstance(old_value, Inventory):
                inventory = Inventory(items=chain(old_value or [], inherited))
                inventory.placing()
                values[name] = inventory
