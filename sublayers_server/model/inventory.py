# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)
from sublayers_server.model.tasks import TaskSingleton, TaskPerformEvent
from sublayers_server.model.messages import InventoryShowMessage, InventoryItemMessage, InventoryAddItemMessage, \
    InventoryDelItemMessage, InventoryHideMessage

EPS = 1e-5


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
        self.managers = []
        self.on_change_list = []  # функции вызываемые на измениние в инвентаре

    def add_inventory(self, inventory, time):

        def local_show_inventory(inv_list):
            log.debug('======================================')
            for rec in inv_list:
                log.debug('item_cls=%s   val=%s    val0=%s', None if not rec['item'] else rec['item'].example.parent,
                          rec['val'], rec['val0'])

        def init_inv_list(inv, time):
            res = []
            for i in range(0, inv.max_size):
                d = dict()
                d['item'] = inv._items.get(i, None)
                d['max_val'] = 0 if d['item'] is None else d['item'].max_val
                d['val0'] = 0 if d['item'] is None else d['item'].val(time)
                d['val'] = d['val0']
                res.append(d)
            return res

        def set_empty_rec(item_rec):
            if item_rec['val'] <= 0:
                item_rec['item'] = None
                item_rec['max_val'] = 0
                item_rec['val0'] = 0
                item_rec['val'] = 0

        def add_item_rec(item_rec1, item_rec2):  # досыпать в rec2 из rec1
            # Можем ли мы досыпать сюда
            if (item_rec2['item'] is None) or (item_rec2['val'] >= item_rec2['max_val']) or \
               (item_rec1['item'].example.parent != item_rec2['item'].example.parent):
                return
            # log.debug('------------------ dosipaem')
            dv = min(item_rec2['max_val'] - item_rec2['val'], item_rec1['val'])
            item_rec1['val'] -= dv
            item_rec2['val'] += dv

        inv1 = init_inv_list(inv=self, time=time)
        inv2 = init_inv_list(inv=inventory, time=time)

        # Проверить, нужно ли уплотнить свой инвентарь
        if len(self.get_items()) + len(inventory.get_items()) >= self.max_size:
            # Уплотнить свой инвентарь
            for i in range(0, len(inv1)):
                rec1 = inv1[i]
                # Можем ли отсыпать из rec1 (если он полный или пустой, то пропустить)
                if (rec1['item'] is None) or (rec1['val'] >= rec1['max_val']):
                    continue
                for j in range(0, i):
                    add_item_rec(rec1, inv1[j])

            # Сделать "пустыми" слотами те итемы, которые после уплотнения равны нулю
            for rec in inv1:
                set_empty_rec(rec)

        # Докинуть полученный инвентарь в свободные слоты (сколько есть слотов, столько и докинуть)
        for i in range(0, len(inv2)):
            rec1 = inv2[i]
            if rec1['item'] is None:
                continue

            # Попытка досыпать в непустые слоты
            for j in range(0, len(inv1)):
                add_item_rec(rec1, inv1[j])

            # Если чтото осталось то положить в свободный слот
            set_empty_rec(rec1)
            if rec1['item'] is not None:
                for j in range(0, len(inv1)):
                    rec2 = inv1[j]
                    if rec2['item'] is not None:
                        continue
                    inv1[j] = rec1
                    inv2[i] = rec2
                    break

        # Генерируем таски для итемов
        for i in range(0, len(inv1)):
            old_item = self.get_item(i)
            item_rec = inv1[i]
            if old_item is not item_rec['item']:  # если итемы не совпадают
                if old_item is not None:
                    old_item.set_inventory(time=time, inventory=None)
                if item_rec['item'] is not None:
                    item_rec['item'].set_inventory(time=time, inventory=self, position=i)
            if (item_rec['item'] is not None) and (item_rec['val0'] != item_rec['val']):
                item_rec['item'].change(consumer=None, dv=item_rec['val'] - item_rec['val0'], ddvs=0, action=None,
                                        time=time)

        for i in range(0, len(inv2)):
            old_item = inventory.get_item(i)
            item_rec = inv2[i]
            if old_item is not item_rec['item']:  # если итемы не совпадают
                if old_item is not None:
                    old_item.set_inventory(time=time, inventory=None)
            if (item_rec['item'] is not None) and (item_rec['val0'] != item_rec['val']):
                item_rec['item'].change(consumer=None, dv=item_rec['val'] - item_rec['val0'], ddvs=0, action=None,
                                        time=time)

    def on_change(self, time):
        for func in self.on_change_list:
            func(inventory=self, time=time)

    def can_change(self, agent):
        return agent in self.managers

    def add_visitor(self, agent, time):
        if agent not in self.visitors:
            self.visitors.append(agent)
        self.send_inventory(agent=agent, time=time)

    def del_all_visitors(self, time):
        visitors = self.visitors[:]
        for visitor in visitors:
            self.del_visitor(agent=visitor, time=time)

    def del_visitor(self, agent, time):
        if agent in self.visitors:
            self.visitors.remove(agent)
        InventoryHideMessage(time=time, agent=agent, inventory_id=self.owner.uid).post()

    def add_manager(self, agent):
        if agent not in self.managers:
            self.managers.append(agent)

    def del_manager(self, agent):
        if agent in self.managers:
            self.managers.remove(agent)

    def get_all_items(self):
        return [dict({'item': item, 'position': self.get_position(item=item)}) for item in self._items.values()]

    def get_items(self):
        return self._items.values()

    def add_item(self, item, time, position=None):
        if position is None:
            # todo: сначала поискать такой же стак, чтобы оно влезло в один стак
            position = self.get_free_position()
            # log.debug('dobavlyaem item %s', item)
        if position is None:
            return False
        assert (position < self.max_size) and (position >= 0)
        if self.get_item(position=position) is not None:
            return False
        self._items.update({position: item})
        for agent in self.visitors:
            InventoryAddItemMessage(agent=agent, time=time, item=item, inventory=self, position=position).post()
        self.on_change(time=time)
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
        self.on_change(time=time)

    def change_position(self, item, new_position, time):
        old_position = self.get_position(item=item)
        if new_position == old_position:
            return False
        item2 = self.get_item(new_position)
        self.del_item(position=old_position, time=time)
        if item2 is not None:
            self.del_item(position=new_position, time=time)
            self.add_item(item=item2, position=old_position, time=time)
        self.add_item(item=item, position=new_position, time=time)
        return True

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

    def get_item_by_cls(self, balance_cls_list, time, min_value=0):
        for position in self._items.keys():
            item = self._items[position]
            if (item.example.parent in balance_cls_list) and (item.limbo is False) and (item.val(t=time) > min_value):
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

    def is_empty(self):
        return len(self._items.values()) == 0


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
        self.owner.on_empty(time=event.time)

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
                self.owner.on_empty(time=time)


class ItemState(object):
    __str_template__ = 'Item: <limbo={self.limbo}> class={self.example.parent.uri} value0={self.val0}'

    def __init__(self, server, time, example, count=1):
        assert count > 0, 'count = {}'.format(count)
        self.server = server
        self.example = example
        self.inventory = None
        self.tasks = []

        # настроки стейта
        self.max_val = example.stack_size
        self.dvs = 0.0
        self.val0 = count
        self.t_empty = None
        self.t0 = time
        self.consumers = []  # список потребителей

        self.limbo = False
        self.is_alive = True  # костыль для тасков

        self._id = id(self)

    id = property(id)

    def _fix_item_state(self, t=None, dt=0.0):
        t = (self.t0 if t is None else t) + dt
        if t != self.t0:
            self.val0 = self.val(t)
            self.t0 = t

    def val(self, t):
        return min(self.val0 - self.dvs * (t - self.t0), self.max_val)

    @assert_time_in_items
    def update_item_state(self, t=None, dt=0.0, dv=None, ddvs=None):
        log.debug('ItemState<%s>.update_item_state() t=%s, dt=%s, dv=%s, ddvs=%s  cur_dvs=%s', self._id, t, dt, dv, ddvs, self.dvs)
        self._fix_item_state(t=t, dt=dt)
        self.t_empty = None
        if dv:
            self.val0 += dv
            assert self.val0 >= 0.0, 'val0 = {}    dv = {}'.format(self.val0, dv)
        if ddvs is not None:
            self.dvs += ddvs
            if abs(self.dvs) < EPS:
                self.dvs = 0.0
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

    def on_empty(self, time):
        assert not self.limbo
        self.limbo = True
        self.t0 = time
        self.t_empty = None
        self.val0 = 0
        self.dvs = 0

        # отправить всем потребителям месагу о том, что итем кончился
        consumers = self.consumers[:]
        for consumer in consumers:
            consumer.on_empty_item(item=self, time=time, action=None)

        # удаляем итем
        if self.inventory is not None:
            self.inventory.del_item(item=self, time=time)

    def export_item_state(self):
        return dict(
            cls=self.__class__.__name__,
            balance_cls=self.example.name,
            example=self.example.as_client_dict(),
            max_val=self.max_val,
            t0=self.t0,
            val0=self.val0,
            dvs=self.dvs,
        )

    def __str__(self):
        return self.__str_template__.format(self=self)

    def _div_item(self, count, time):
        if self.val(t=time) < count:
            return None
        ItemTask(consumer=None, owner=self, dv=-count, ddvs=0.0, action=None).start(time=time)
        return ItemState(server=self.server, time=time, example=self.example, count=count)

    # Интерфейс работы с итемом со стороны окна клиента
    def set_inventory(self, time, inventory, position=None):
        assert not self.limbo
        # log.debug('IteemState.set_inventory for %s ', self)
        old_inventory = self.inventory
        if inventory is old_inventory:
            return self.change_position(position=position, time=time)
        if (inventory is None) or inventory.add_item(item=self, position=position, time=time):
            if old_inventory is not None:
                old_inventory.del_item(item=self, time=time)

            # отправить всем потребителям месагу о том, что итем кончился
            consumers = self.consumers[:]
            for consumer in consumers:
                consumer.on_empty_item(item=self, time=time, action=None)

            self.inventory = inventory
            return True
        else:
            return False

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
        if self.example.parent != item.example.parent:
            if self.inventory is item.inventory:
                self.change_position(position=self.inventory.get_position(item=item), time=time)
            else:
                item1_inventory = self.inventory
                item1_position = item1_inventory.get_position(item=self)
                item2_inventory = item.inventory
                item2_position = item2_inventory.get_position(item=item)
                self.set_inventory(time=time, inventory=None)
                item.set_inventory(time=time, inventory=item1_inventory, position=item1_position)
                self.set_inventory(time=time, inventory=item2_inventory, position=item2_position)
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
            return self.inventory.change_position(item=self, new_position=position, time=time)
        return False

    # Интерфейс работы с итемом со стороны потребителя
    def linking(self, consumer):
        if consumer not in self.consumers and not self.limbo:
            self.consumers.append(consumer)
            consumer.item = self

    def unlinking(self, consumer):
        if consumer in self.consumers:
            self.consumers.remove(consumer)
            consumer.item = None

    def change(self, consumer, dv, ddvs, action, time):
        if (consumer is None) or (consumer in self.consumers):
            if self.limbo:
                assert action == 'on_stop'
                if consumer:
                    consumer.on_stop(item=self, time=time)
            else:
                ItemTask(consumer=consumer, owner=self, dv=dv, ddvs=ddvs, action=action).start(time=time)


class Consumer(object):
    def __init__(self, server, items_cls_list, dv=None, ddvs=None, swap=False):
        self.server = server
        self.items_cls_list = items_cls_list
        self.item = None
        self.dv = dv
        self.ddvs = ddvs
        self.swap = swap
        self.is_call_start = False
        self.is_call_stop = False
        self.is_started = False
        self._id = id(self)

    id = property(id)

    def __str__(self):
        dv = self.dv if self.dv is not None else 'None'
        ddvs = self.ddvs if self.ddvs is not None else 'None'
        return 'Consumer:: dv={}, ddvs={}'.format(dv, ddvs)

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
            self.start(time=time)

    def use(self, time):
        if self.item is not None:
            self.item.change(consumer=self, dv=self.dv, ddvs=None, action='on_use', time=time)

    def start(self, time):
        if self.is_call_start:
            return False
        if self.item is not None:
            self.is_call_start = True
            self.item.change(consumer=self, dv=None, ddvs=self.ddvs, action='on_start', time=time)
            return True
        return False

    def stop(self, time):
        log.debug('Consumer<%s>.stop', self._id)
        if self.is_call_stop:
            return
        if self.item is not None:
            self.is_call_stop = True
            self.item.change(consumer=self, dv=None, ddvs=-self.ddvs, action='on_stop', time=time)

    def on_use(self, item, time):
        pass

    def on_start(self, item, time):
        self.is_call_start = False
        self.is_started = True

    def on_stop(self, item, time):
        self.is_call_stop = False
        self.is_started = False

    # при установки итема, если необходимо сменить параметры потребления,
    # то перехватить этот метод и вызвать метод set_item_params
    def set_item(self, item, time, action=None):
        started = self.is_started
        # останавливаем использование
        if started or self.is_call_start:
            self.stop(time=time)
            self.is_started = False  # перестать стрелять, если что старт потом установит стрельбу

        # разряжаем итем
        if self.item is not None:
            self.item.unlinking(consumer=self)
            self.is_call_start = False
            self.is_call_stop = False

        # пытаемся зарядить итем
        if (item is not None) and (item.example.parent in self.items_cls_list):
            item.linking(consumer=self)

            # если нужно, пытаемся восстановить использование
            if started:
                self.start(time=time)

            # если была попытка списать разово итем, но не вышло, то снова пытаемся списать из нового итема
            if action == 'on_use':  # так устроено, страдаем все
                self.use(time=time)

    def on_empty_item(self, item, time, action):
        # log.debug('Consumer.on_empty_item')
        balance_cls_list = []
        if self.swap:
            balance_cls_list = self.items_cls_list
        else:
            balance_cls_list = [item.example.parent]
        new_item = item.inventory.get_item_by_cls(balance_cls_list=balance_cls_list, time=time, min_value=-self.dv)
        log.debug('Consumer<%s>.on_empty_item new_item = %s ', self._id, new_item)
        self.set_item(time=time, item=new_item, action=action)

