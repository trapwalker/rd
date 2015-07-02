# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)
from sublayers_server.model.tasks import TaskSingleton, TaskPerformEvent

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

    def change_position(self, item, new_position):
        old_position = self.get_position(item=item)
        if self.add_item(item=item, position=new_position):
            self.del_item(position=old_position)

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

    def get_item_by_cls(self, balance_cls_list, time, min_value=0):
        for position in self._items.keys():
            item = self._items[position]
            if (item.balance_cls in balance_cls_list) and (item.limbo is False) and (item.val(t=time) > min_value):
                return item
        return None


class ItemTask(TaskSingleton):
    def __init__(self, dv=None, ddvs=None, consumer=None, action=None, **kw):
        super(ItemTask, self).__init__(**kw)
        self.dv = dv
        self.ddvs = ddvs
        self.consumer = consumer
        assert (((consumer is None) and (action is None)) or ((consumer is not None) and (action is not None))) and (
            (action is None) or (action in ['on_use', 'on_start', 'on_stop']))
        self.action = action

    def on_perform(self, event):
        super(ItemTask, self).on_perform(event=event)
        self.owner.set_item_empty(time=event.time)
        self.owner.set_inventory(inventory=None, time=event.time)

    def on_start(self, event):
        super(ItemTask, self).on_start(event=event)
        item = self.owner
        time = event.time

        log.debug('ItemTask:: on_start --> item = %s (%s, %s)', item, self.dv, self.ddvs)

        if (self.dv is not None) and (self.dv < 0.0) and (item.val(t=time) < -self.dv):
            # отправить потребителю месагу о том, что итем кончился
            if self.consumer is not None:
                self.consumer.on_empty_item(item=item, time=time, action=self.action)
            return
        t_empty = item.update_item_state(t=time, dv=self.dv, ddvs=self.ddvs)

        if self.action is not None:
            # отправить сообщение consumer'у с учётом экшена
            self.consumer.__getattribute__(self.action)(item=item, time=time)

        if t_empty is not None:
            TaskPerformEvent(time=t_empty, task=self).post()


class ItemState(object):
    __str_template__ = 'Item: <limbo={self.limbo}> class={self.balance_cls} value0={self.val0}'

    def __init__(self, server, time, balance_cls, count=1):
        assert count > 0
        self.server = server
        self.balance_cls = balance_cls
        self.inventory = None
        self.tasks = []

        # настроки стейта
        self.max_val = 64  # todo: взять из balance_cls
        self.dvs = 0.0
        self.val0 = count
        self.t_empty = None
        self.t0 = time
        self.consumers = []  # список потребителей

        self.limbo = False
        self.is_alive = True  # костыль для тасков

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
            assert (dv <= 0.0) and (self.val0 >= 0.0), 'val0 = {}    dv = {}'.format(self.val0, dv)
        if ddvs is not None:
            self.dvs += ddvs
            assert self.dvs >= 0.0
        if self.dvs > 0.0:
            self.t_empty = self.t0 + self.val0 / self.dvs
        else:
            if self.val0 == 0.0:
                self.t_empty = self.t0
        return self.t_empty

    def set_item_empty(self, time):
        self.t0 = time
        self.t_empty = None
        self.val0 = 0
        self.dvs = 0

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

    # если inventory = None, то работает как удаление итема
    def set_inventory(self, time, inventory, position=None):
        old_inventory = self.inventory
        assert inventory is not old_inventory
        if (inventory is None) or inventory.add_item(item=self, position=position):
             # запретить потребление итема пока он не в инвентаре
            self.limbo = inventory is None

            # отправить всем потребителям месагу о том, что итем кончился
            consumers = self.consumers[:]
            for consumer in consumers:
                consumer.on_empty_item(item=self, time=time, action=None)

            if old_inventory is not None:
                old_inventory.del_item(item=self)
            self.inventory = inventory

            return True
        else:
            return False

    def add_another_item(self, item, time):
        pass
        # todo: переделать под state
        '''
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
        '''

    # Интерфейс работы с итемом
    def linking(self, consumer):
        if consumer not in self.consumers and not self.limbo:
            self.consumers.append(consumer)
            consumer.item = self

    def unlinking(self, consumer):
        if consumer in self.consumers:
            self.consumers.remove(consumer)
            consumer.item = None

    def change(self, consumer, dv, ddvs, action, time):
        if consumer in self.consumers and not self.limbo:
            ItemTask(consumer=consumer, owner=self, dv=dv, ddvs=ddvs, action=action).start(time=time)


class Consumer(object):
    def __init__(self, items_cls_list, dv=None, ddvs=None, swap=False):
        self.items_cls_list = items_cls_list
        self.item = None
        self.dv = dv
        self.ddvs = ddvs
        self.swap = swap
        self.is_started = False

    def set_item_params(self, dv, ddvs, swap, time):
        assert ((dv is not None) or (ddvs is not None)) and isinstance(swap, bool)
        started = self.is_started
        # останавливаем использование
        if started:
            self.stop(time=time)
        # устанавливаем новые параметры
        self.dv = dv
        self.ddvs = ddvs
        self.swap = swap
         # если нужно, пытаемся восстановить использование с новыми параметрами
        if started:
            self.start(time=time + 0.01)

    def use(self, time):
        if self.item is not None:
            self.item.change(consumer=self, dv=self.dv, ddvs=None, action='on_use', time=time)

    def start(self, time):
        if self.item is not None:
            self.item.change(consumer=self, dv=None, ddvs=self.ddvs, action='on_start', time=time)

    def stop(self, time):
        if self.item is not None:
            self.item.change(consumer=self, dv=None, ddvs=-self.ddvs, action='on_stop', time=time)

    def on_use(self, item, time):
        pass

    def on_start(self, item, time):
        self.is_started = True

    def on_stop(self, item, time):
        self.is_started = False

    # при установки итема, если необходимо сменить параметры потребления,
    # то перехватить этот метод и вызвать метод set_item_params
    def set_item(self, item, time, action=None):
        started = self.is_started
        # останавливаем использование
        if started:
            self.stop(time=time)
            self.is_started = False  # перестать стрелять, если что старт потом установит стрельбу
        # разряжаем итем
        if self.item is not None:
            self.item.unlinking(consumer=self)
        # пытаемся зарядить итем
        if (item is not None) and (item.balance_cls in self.items_cls_list):
            item.linking(consumer=self)
        # если нужно, пытаемся восстановить использование
        if started:
            self.start(time=time + 0.01)
        # если была попытка списать разово итем, но не вышло, то снова пытаемся списать из нового итема
        if action == 'on_use':  # так устроено, страдаем все
            self.use(time=time)

    def on_empty_item(self, item, time, action):
        old_is_started = self.is_started
        balance_cls_list = []
        if self.swap:
            balance_cls_list = self.items_cls_list
        else:
            balance_cls_list = [item.balance_cls]
        new_item = item.inventory.get_item_by_cls(balance_cls_list=balance_cls_list, time=time, min_value=-self.dv)
        log.debug('new item = %s', new_item)
        if self.is_started:
            self.on_stop(item=item, time=time)
        self.is_started = old_is_started
        self.set_item(item=new_item, time=time, action=action)


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


