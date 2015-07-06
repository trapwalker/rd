# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)
from sublayers_server.model.tasks import TaskSingleton, TaskPerformEvent
from sublayers_server.model.messages import InventoryShowMessage, InventoryItemMessage, InventoryAddItemMessage, \
    InventoryDelItemMessage, InventoryHideMessage

class ETimeIsNotInState(Exception):
    pass


def assert_time_in_items(f):
    from functools import update_wrapper
    def cover(self, t=None, *av, **kw):
        if self.t_empty is not None and t is not None and t > self.t_empty:
            raise ETimeIsNotInState('Time {} given, but {} is last in this item state'.format(t, self.t_empty))
        return f(self, t=t, *av, **kw)
    return update_wrapper(cover, f)


class Inventory(object):
    def __init__(self, owner, max_size, time):
        self.max_size = max_size
        self._items = dict()
        self.owner = owner
        self.visitors = []

    def add_visitor(self, agent, time):
        if agent not in self.visitors:
            self.visitors.append(agent)
            self.send_inventory(agent=agent, time=time)

    def del_visitor(self, agent, time):
        if agent in self.visitors:
            self.visitors.remove(agent)
            InventoryHideMessage(time=time, agent=agent, inventory=self).post()

    def add_item(self, item, time, position=None):
        if position is None:
            position = self.get_free_position()
        if position is None:
            return False
        assert (position < self.max_size) and (position >= 0)
        if self.get_item(position=position) is not None:
            return False
        self._items.update({position: item})
        for agent in self.visitors:
            InventoryAddItemMessage(agent=agent, time=time, item=item, inventory=self, position=position).post()
        return True

    def del_item(self, time, position=None, item=None):
        assert (position is not None) or (item is not None) or \
               ((position is not None) and (item is not None) and (self._items[position] == item))
        if position is None:
            position = self.get_position(item=item)
        assert position is not None
        deleted_item = self._items.pop(position)

        for agent in self.visitors:
            InventoryDelItemMessage(agent=agent, time=time, item=deleted_item, inventory=self,
                                     position=position).post()

    def change_position(self, item, new_position, time):
        old_position = self.get_position(item=item)
        if self.add_item(item=item, position=new_position, time=time):
            self.del_item(position=old_position, time=time)

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

    def as_dict(self):
        return dict(
            max_size=self.max_size,
            items=[dict({'item': item.export_item_state(),
                         'position': self.get_position(item=item)}) for item in self._items.values()],
            owner_id=self.owner.uid
        )

    def send_inventory(self, agent, time):
        InventoryShowMessage(agent=agent, time=time, inventory=self).post()


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
        self.owner.on_update(time=event.time)
        self.owner.set_inventory(inventory=None, time=event.time)

    def on_start(self, event):
        super(ItemTask, self).on_start(event=event)
        item = self.owner
        time = event.time
        t_empty = None
        #log.debug('ItemTask:: on_start --> item = %s (%s, %s)', item, self.dv, self.ddvs)
        if (self.dv is not None) and (self.dv < 0.0) and (item.val(t=time) < -self.dv):
            # отправить потребителю месагу о том, что итем кончился
            if self.consumer is not None:
                self.consumer.on_empty_item(item=item, time=time, action=self.action)
            # здесь нельзя сделать просто ретурн, так как ивент с окончанием уже удалён. Пересоздать его позже
            t_empty = self.owner.t_empty
        else:
            t_empty = item.update_item_state(t=time, dv=self.dv, ddvs=self.ddvs)
            item.on_update(time=time)
            if self.action is not None:
                # отправить сообщение consumer'у с учётом экшена
                self.consumer.__getattribute__(self.action)(item=item, time=time)

        if t_empty is not None:
            if t_empty > time:
                TaskPerformEvent(time=t_empty, task=self).post()
            else:
                self.owner.set_item_empty(time=event.time)
                self.owner.set_inventory(inventory=None, time=event.time)


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
            assert self.val0 >= 0.0, 'val0 = {}    dv = {}'.format(self.val0, dv)
        if ddvs is not None:
            self.dvs += ddvs
            assert self.dvs >= 0.0
        if self.dvs > 0.0:
            self.t_empty = self.t0 + self.val0 / self.dvs
        else:
            if self.val0 == 0.0:
                self.t_empty = self.t0
        return self.t_empty

    def on_update(self, time):
        if self.inventory:
            for agent in self.inventory.visitors:
                InventoryItemMessage(agent=agent, time=time, item=self, inventory=self.inventory,
                                     position=self.inventory.get_position(item=self)).post()

    def set_item_empty(self, time):
        self.t0 = time
        self.t_empty = None
        self.val0 = 0
        self.dvs = 0

    def export_item_state(self):
        return dict(
            cls=self.__class__.__name__,
            balance_cls=self.balance_cls,
            max_val=self.max_val,
            t0=self.t0,
            val0=self.val0,
            dvs=self.dvs,
        )

    def __str__(self):
        return self.__str_template__.format(self=self)

    # если inventory = None, то работает как удаление итема
    def set_inventory(self, time, inventory, position=None):
        assert not self.limbo
        old_inventory = self.inventory
        assert inventory is not old_inventory
        if (inventory is None) or inventory.add_item(item=self, position=position, time=time):
             # запретить потребление итема пока он не в инвентаре
            self.limbo = inventory is None

            # отправить всем потребителям месагу о том, что итем кончился
            consumers = self.consumers[:]
            for consumer in consumers:
                consumer.on_empty_item(item=self, time=time, action=None)

            if old_inventory is not None:
                old_inventory.del_item(item=self, time=time)
            self.inventory = inventory

            return True
        else:
            return False

    def _div_item(self, count, time):
        if self.val(t=time) < count:
            return None
        ItemTask(consumer=None, owner=self, dv=-count, ddvs=0.0, action=None).start(time=time)
        return ItemState(server=self.server, time=time, balance_cls=self.balance_cls, count=count)

    def div_item(self, count, time, inventory, position):
        assert not self.limbo
        assert (position is None) or ((position is not None) and (inventory is not None))
        if (position is not None) and (inventory.getItem(position=position) is not None):
            return
        if (position is None) and (inventory is not None):
            position = inventory.get_free_position()
            if position is None:  # если инвентарь оказался полный
                return
        item = self._div_item(count=count, time=time)
        if item is not None:
            item.set_inventory(time=time, inventory=inventory, position=position)

    def add_another_item(self, item, time):
        assert not self.limbo and not item.limbo
        if self.balance_cls != item.balance_cls:
            return
        self_val = self.val(t=time)
        item_val = item.val(t=time)
        d_value = 0.0

        if (self_val + item_val) <= self.max_val:
            d_value = item_val
        else:
            d_value = self.max_val - self_val
        ItemTask(consumer=None, owner=self, dv=d_value, ddvs=0.0, action=None).start(time=time)
        ItemTask(consumer=None, owner=item, dv=-d_value, ddvs=0.0, action=None).start(time=time)

    def change_position(self, position, time):
        assert not self.limbo
        if self.inventory is not None:
            self.inventory.change_position(item=self, new_position=position, time=time)

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
        if self.is_started:
            self.on_stop(item=item, time=time)
        self.is_started = old_is_started
        self.set_item(item=new_item, time=time, action=action)