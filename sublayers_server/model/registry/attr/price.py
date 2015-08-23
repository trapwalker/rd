# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

#from sublayers_server.model.registry.attr import Attribute
from base import Attribute
from sublayers_server.model.registry import tree
from sublayers_server.model.registry.uri import URI

from itertools import chain


class PriceOption(object):
    def __init__(self, uri=None, buy=None, sale=None, doc=None):
        # todo: update or immutable
        if isinstance(uri, basestring):
            uri = URI(uri)
        self.uri = uri or URI('reg://registry/items')
        self.buy = buy
        self.sale = sale
        self.doc = doc

    def __repr__(self):
        return '{self.__class__.__name__}({self.uri!r}, {self.buy!r}, {self.sale!r}{doctail})'.format(
            self=self,
            doctail=', {!r}'.format(self.doc) if self.doc else '',
        )


class Price(list):
    def __init__(self, items=None):
        """
        """
        # todo: проксировать унаследованные части инвентаря так, чтобы прототипы можно было менять
        super(Price, self).__init__()
        self.extend(items or [])

    def prepare(self, item):
        if isinstance(item, PriceOption):
            return item
        elif isinstance(item, (list, tuple)) and 3 <= len(item) <= 4:
            return PriceOption(*item)

        raise ValueError('Wrong price option value: {!r}'.format(item))

    def __setitem__(self, key, value):
        super(Price, self).__setitem__(key, self.prepare(value))

    def append(self, item):
        super(Price, self).append(self.prepare(item))

    def extend(self, items):
        for item in items:
            self.append(item)

    def remove(self, item):
        # todo: remove item by parent uri?
        super(Price, self).remove(item)

    def sort(self, *av, **kw):
        super(Price, self).sort(*av, **kw)

    __iadd__ = extend

    def __imul__(self, other):
        raise Exception('Unsupported method')

    def get_item_price(self, item):
        for option in self:
            if option.uri.match(item):
                return option

    def get_pricelist(self, items):
        price = {}
        for item in items:
            assert not isinstance(item, basestring)
            if isinstance(item, URI):
                item = item.resolve()  # todo: (!!!!)

            option = self.get_item_price(item)
            if option:
                price[item.id] = option.buy, option.sale
        return price


    # def __contains__  # todo: extended filtering
    # def __repr__
    # def __str__  # todo: Сделать краткое текстовое представление инвентаря для отладки и логов (алиасы прототипов)
    # def count    # todo: подсчет предметов по классам, тегам, префиксам путей в реестре


class PriceAttribute(Attribute):
    def __init__(self, default=None, **kw):
        assert default is None, 'Default value of PriceAttribute is not supported'
        super(PriceAttribute, self).__init__(default=default, **kw)

    # def __set__(self, obj, value):  # todo: do not replace price list, but replace options

    def prepare(self, obj):
        super(PriceAttribute, self).prepare(obj)
        name = self.name
        values = obj.values

        old_value = values.get(name)
        inherited = getattr(obj.parent, name, [])

        values[name] = Price(items=chain(old_value or [], inherited))  # todo: Динамическое наследование (проброс)
