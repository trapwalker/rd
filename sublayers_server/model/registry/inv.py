# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.attr import Attribute


class Inventory(list):
    def __init__(self, attr, obj, items=None):
        """
        @param Attribute attr: Attribute descriptor
        @param sublayers_server.model.registry.tree.Node obj: Node
        """
        super(Inventory, self).__init__()
        self._attr = attr
        self._obj = obj
        if items:
            self.extend(items)

    def instantiate(self):
        pass

    @property
    def inherited(self):
        # todo: cache
        obj_parent = self._obj.parent
        name = self._attr.name
        if hasattr(obj_parent, name):
            return getattr(obj_parent, name)

    # def __add__
    # def __contains__
    # def __delitem__
    # def __delslice__
    # def __format__
    # def __getitem__
    # def __getslice__
    # def __hash__
    # # def __iadd__
    # # def __imul__
    # def __iter__
    # def __len__
    # def __repr__
    # def __setitem__
    # def __setslice__
    # def __str__
    # #def __subclasshook__
    # def append
    # def count
    # def extend
    # def index
    # def insert
    # def pop
    # def remove
    # #def sort


class InventoryAttribute(Attribute):
    def __init__(self, default=None, **kw):
        assert default is None, 'Default value of InventoryAttribute is not supported'
        super(InventoryAttribute, self).__init__(default=default, **kw)

    # def __set__(self, obj, value):  # todo: do not replace inventory list, but replace goods

    def get_raw(self, obj):
        """
        :type obj: sublayers_server.model.registry.tree.Node
        """
        value = obj.values.setdefault(self.name, Inventory(self, obj))
        if not isinstance(value, Inventory):
            # todo: need to remove this temporary code
            value = Inventory(self, obj, items=value)
            obj.values[self.name] = value

        return value
