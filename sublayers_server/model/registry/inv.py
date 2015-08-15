# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.attr import Attribute
from sublayers_server.model.registry import tree

from itertools import chain


class Inventory(list):
    def __init__(self, abstract, items=None):
        """
        @param Attribute attr: Attribute descriptor
        @param sublayers_server.model.registry.tree.Node obj: Node
        """
        # todo: Внимание, абстрактыне инвентари (принадлежащие прототипам в реестре) менять нельзя
        # todo: проксировать унаследованные части инвентаря так, чтобы прототипы можно было менять
        super(Inventory, self).__init__()
        self.abstract = abstract
        if items:
            super(Inventory, self).extend(items)

    def __getinitargs__(self):
        return list(self)

    def prepare(self, value):
        if isinstance(value, tree.Node):
            return value
        #elif isinstance(value, basestring) and :  # todo: (!!!)

    def instantiate(self):
        pass

    def __setitem__(self, key, value):
        assert not self.abstract
        super(Inventory, self).__setitem__(key, value)

    def extend(self, items):
        assert not self.abstract
        super(Inventory, self).extend(items)

    def remove(self, item):
        # todo: remove item by parent uri?
        assert not self.abstract
        super(Inventory, self).remove(item)

    def sort(self, *av, **kw):
        assert not self.abstract
        super(Inventory, self).sort(*av, **kw)

    def __iadd__(self, other):
        assert not self.abstract
        super(Inventory, self).__iadd__(other)

    def __imul__(self, other):
        assert not self.abstract
        super(Inventory, self).__imul__(other)

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
        name = self.name
        values = obj.values
        old_value = values.get(name)
        assert not isinstance(old_value, Inventory)
        inherited = getattr(obj.parent, name, [])
        values[name] = Inventory(abstract=obj.abstract, items=chain(old_value or [], inherited))

    def get_raw(self, obj):
        """
        :type obj: sublayers_server.model.registry.tree.Node
        """
        return obj.values.get(self.name)
