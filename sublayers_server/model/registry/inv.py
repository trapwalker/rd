# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.attr import Attribute
from sublayers_server.model.registry import tree


class Inventory(list):
    def __init__(self, items=None):
        """
        @param Attribute attr: Attribute descriptor
        @param sublayers_server.model.registry.tree.Node obj: Node
        """
        super(Inventory, self).__init__()
        if items:
            self.extend(items)

    def __getinitargs__(self):
        return list(self)

    def prepare(self, value):
        if isinstance(value, tree.Node):
            return value
        #elif isinstance(value, basestring) and :  # todo: (!!!)

    def instantiate(self):
        pass

    def inherited(self, attr, obj):
        # todo: cache
        obj_parent = obj.parent
        name = attr.name
        if hasattr(obj_parent, name):
            return getattr(obj_parent, name)

    def __setitem__(self, key, value):
        pass

    # def __contains__
    # # def __iadd__
    # # def __imul__
    # def __repr__
    # def __str__
    # def count
    # def extend
    # def index
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
        value = obj.values.setdefault(self.name, Inventory())
        if not isinstance(value, Inventory):
            # todo: need to remove this temporary code
            value = Inventory(items=value)
            obj.values[self.name] = value

        return value
