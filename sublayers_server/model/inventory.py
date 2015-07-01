# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)
from sublayers_server.model.tasks import Task, TaskPerformEvent

class ETimeIsNotInState(Exception):
    pass


def assert_time_in_items(f):
    from functools import update_wrapper
    def cover(self, t=None, *av, **kw):
        if self.t_empty is not None and t is not None and t > self.t_empty:
            raise ETimeIsNotInState('Time {} given, but {} is last in this fuel state'.format(t, self.t_empty))
        return f(self, t=t, *av, **kw)
    return update_wrapper(cover, f)


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

    def get_item_by_cls(self, balance_cls_list):
        for position in self._items.keys():
            item = self._items[position]
            if (item.balance_cls in balance_cls_list) and (item.limbo is False):
                return item
        return None


class ItemTask(Task):
    def __init__(self, dv=None, ddvs=None, consumer=None, action=None, **kw):
        super(ItemTask, self).__init__(**kw)
        assert self.owner.hp_state is not None
        self.dv = dv
        self.ddvs = ddvs
        self.consumer = consumer

    def _clear_tasks(self, time):
        events = self.owner.task.events[:]
        for event in events:
            if event.time >= time:
                event.cancel()

    def on_perform(self, event):
        super(ItemTask, self).on_perform(event=event)
        self.owner.limbo = True
        for consumer in self.owner.consumers:
            # todo: отправить потребителю месагу о том, что итем кончился
            pass
        # todo: как-то удалить итем

    def on_start(self, event):
        self._clear_tasks(time=event.time)
        super(ItemTask, self).on_start(event=event)
        item = self.owner
        time = event.time
        if (self.dv is not None) and (item.val(t=time) > self.dv):
            # todo: отправить потребителю месагу о том, что итем кончился
            return
        t_empty = item.update_item_state(t=time, dv=self.dv, ddvs=self.ddvs)

        if self.action is not None:
            # todo: отправить сообщение consumer'у с учётом экшена
            pass

        if t_empty is not None:
            TaskPerformEvent(time=t_empty, task=self).post()



class ItemState(object):
    __str_template__ = 'Item: class={self.balance_cls} object={self.balance_obj} count={self.count}'

    def __init__(self, server, time, balance_cls, balance_obj=None, count=1):
        assert (count == 1) or ((count != 1) and (balance_obj is None))
        self.server = server
        self.balance_cls = balance_cls
        self.balance_obj = balance_obj
        self.inventory = None
        self.task = None

        # настроки стейта
        self.max_val = 64  # todo: взять из balance_cls
        self.dvs = 0.0
        self.val0 = count
        self.t_empty = None
        self.t0 = time
        self.consumers = []  # список потребителей

        self.limbo = False

    def _fix_item_state(self, t=None, dt=0.0):
        t = (self.t0 if t is None else t) + dt
        if t != self.t0:
            self.fuel0 = self.val(t)
            self.t0 = t

    def val(self, t):
        return min(self.val0 - self.dvs * (t - self.t0), self.max_val)

    @assert_time_in_items
    def update_item_state(self, t=None, dt=0.0, dv=None, ddvs=None):
        self._fix_item_state(t=t, dt=dt)
        self.t_empty = None
        if dv:
            self.val0 += dv
            assert (dv <= 0.0) and (self.val0 >= 0.0)
        if ddvs is not None:
            self.dvs += ddvs
            assert self.dvs >= 0.0
        if self.dvs > 0.0:
            self.t_empty = self.t0 + self.val0 / self.dvs
        return self.t_empty

    def export_item_state(self):
        return dict(
            cls=self.__class__.__name__,
            t0=self.t0,
            max_val=self.max_val,
            val0=self.val0,
            dvs=self.dvs,
        )

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
        if self.count + item.count <= self.max_val:
            self.count += item.count
            if item.inventory is not None:
                item.inventory.del_item(item=item)
                item.inventory = None
            item.count = 0
        else:
            item.count -= self.max_val - self.count
            self.count = self.max_val
        return True


    # Интерфейс работы с итемом
    def linking(self, consumer):
        if consumer in self.consumers:
            return False
        self.consumers.append(consumer)
        return True

    def unlinking(self, consumer):
        if consumer in self.consumers:
            self.consumers.remove(consumer)
            return True
        return False


class Consumer(object):
    def __init__(self):
        self.items = dict()
        self.is_started = False

    def add_needed_item(self, name, items_cls_list):
        self.items.update({name: {
            'items_cls_list': items_cls_list,
            'item': None
        }})

    def get_name_by_item(self, item):
        for name in self.items.keys():
            if self.items[name]['item'] is item:
                return name
        return None

    def use(self, item):
        pass

    def on_use(self, item):
        pass

    def _start_use_item(self, item):
        # todo: item.start_use(consumer=self)
        pass

    def start_use(self, item):
        pass

    def stop_use(self, item):
        pass

    def on_start_use(self, item):
        pass

    def on_stop_use(self, item):
        pass

    def set_item(self, name, item):
        started = self.is_started
        if (item is None) or (item.balance_cls in self.items[name]['items_cls_list']):
            self.items[name]['item'] = item
            if started and (item is not None):
                self._start_use_item(item=item)

    def unset_item(self, name):
        item = self.items[name]['item']
        if item is not None:
            item.unlinking(consumer=self)
            self.items[name]['item'] = None

    def on_empty_item(self, item):
        name = self.get_name_by_item(item=item)
        if name is None:
            return
        new_item = item.inventory.get_item_by_cls(balance_cls_list=self.items[name]['items_cls_list'])
        self.set_item(item=new_item, name=name)


if __name__ == '__main__':
    inv1 = Inventory(max_size=3)
    inv2 = Inventory(max_size=3)
    itm1 = ItemState(balance_cls=ItemState, count=40)
    print itm1.set_inventory(inventory=inv1, position=2)
    itm2 = ItemState(balance_cls=ItemState, count=30)
    print itm2.set_inventory(inventory=inv2, position=2)
    print itm1.add_another_item(itm2)


    for rec in inv1._items.items():
        print 'inv1 ', rec[0], ' ', rec[1]

    for rec in inv2._items.items():
        print 'inv2 ', rec[0], ' ', rec[1]


    itm3 = ItemState(balance_cls=Inventory, count=3)

    print inv2.add_item(itm3)


    for rec in inv2._items.items():
        print 'inv2 ', rec[0], ' ', rec[1]


