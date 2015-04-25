# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)


class Inventory(object):
    def __init__(self, max_size):
        self.max_size = max_size
        self._items = dict()

    def add_item(self, item, position=None):
        if position is None:
            position = self.get_free_position()
        if position is None:
            return False
        assert (position < self.max_size) and (position >= 0)
        if self.get_item(position=position) is not None:
            return False
        self._items.update({position: item})
        return True

    def del_item(self, position=None, item=None):
        assert (position is not None) or (item is not None) or \
               ((position is not None) and (item is not None) and (self._items[position] == item))
        if position is None:
            position = self.get_position(item=item)
        assert position is not None
        self._items.pop(position)

    def get_position(self, item):
        for rec in self._items.items():
            if rec[1] is item:
                return rec[0]
        return None

    def get_item(self, position):
        if position in self._items.keys():
            return self._items[position]
        return None

    def get_free_position(self):
        for i in xrange(self.max_size):
            if self.get_item(position=i) is None:
                return i
        return None


class Item(object):
    __str_template__ = 'Item: class={self.balance_cls} object={self.balance_obj} count={self.count}'

    def __init__(self, balance_cls, balance_obj=None, count=1):
        assert (count == 1) or ((count != 1) and (balance_obj is None))
        self.inventory = None
        self.balance_cls = balance_cls
        self.balance_obj = balance_obj
        self.count = count
        self.max_count = 64  # todo: взять из balance_cls

    def __str__(self):
        return self.__str_template__.format(self=self)

    def set_inventory(self, inventory, position=None):
        old_inventory = self.inventory
        if inventory.add_item(item=self, position=position):
            if old_inventory is not None:
                old_inventory.del_item(item=self)
            self.inventory = inventory
            return True
        else:
            return False

    def add_another_item(self, item):
        if (self.balance_obj is not None) or (item.balance_obj is not None) or (self.balance_cls != item.balance_cls):
            return False
        if self.count + item.count <= self.max_count:
            self.count += item.count
            if item.inventory is not None:
                item.inventory.del_item(item=item)
                item.inventory = None
            item.count = 0
        else:
            item.count -= self.max_count - self.count
            self.count = self.max_count
        return True


if __name__ == '__main__':
    inv1 = Inventory(max_size=3)
    inv2 = Inventory(max_size=3)
    itm1 = Item(balance_cls=Item, count=40)
    print itm1.set_inventory(inventory=inv1, position=2)
    itm2 = Item(balance_cls=Item, count=30)
    print itm2.set_inventory(inventory=inv2, position=2)
    print itm1.add_another_item(itm2)


    for rec in inv1._items.items():
        print 'inv1 ', rec[0], ' ', rec[1]

    for rec in inv2._items.items():
        print 'inv2 ', rec[0], ' ', rec[1]


    itm3 = Item(balance_cls=Inventory, count=3)

    print inv2.add_item(itm3)


    for rec in inv2._items.items():
        print 'inv2 ', rec[0], ' ', rec[1]


