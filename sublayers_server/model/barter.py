# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)
from sublayers_server.model.inventory import Inventory
from sublayers_server.model.events import Event
from sublayers_server.model.messages import Message
from sublayers_server.model.base import Object
from sublayers_server.model.poi_loot_objects import CreatePOILootEvent, POIContainer


class InitBarterEvent(Event):
    def __init__(self, initiator, recipient_login, **kw):
        super(InitBarterEvent, self).__init__(server=initiator.server, **kw)
        self.initiator = initiator
        self.recipient_login = recipient_login

    def on_perform(self):
        super(InitBarterEvent, self).on_perform()
        recipient = self.server.agents.get(self.recipient_login, None)

        for barter in self.initiator.barters:
            # Проверить нет ли уже приглашения для этого пользователя и если есть то новое не создавать
            if barter.recipient is recipient:
                return
            # Проверить нет ли уже приглашения от оппонента и если есть то принять его
            if barter.initiator is recipient:
                barter.on_activate(recipient=self.initiator, time=self.time)
                return

        if recipient:
            Barter(initiator=self.initiator, recipient=recipient, time=self.time)


class ActivateBarterEvent(Event):
    def __init__(self, barter_id, recipient, **kw):
        super(ActivateBarterEvent, self).__init__(server=recipient.server, **kw)
        self.recipient = recipient
        self.barter_id = barter_id

    def on_perform(self):
        super(ActivateBarterEvent, self).on_perform()
        barter = self.recipient.get_barter_by_id(barter_id=self.barter_id)
        if barter is not None:
            barter.on_activate(recipient=self.recipient, time=self.time)


class LockBarterEvent(Event):
    def __init__(self, barter_id, agent, **kw):
        super(LockBarterEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.barter_id = barter_id

    def on_perform(self):
        super(LockBarterEvent, self).on_perform()
        barter = self.agent.get_barter_by_id(barter_id=self.barter_id)
        if barter is not None:
            barter.on_lock(agent=self.agent, time=self.time)


class UnLockBarterEvent(Event):
    def __init__(self, barter_id, agent, **kw):
        super(UnLockBarterEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.barter_id = barter_id

    def on_perform(self):
        super(UnLockBarterEvent, self).on_perform()
        barter = self.agent.get_barter_by_id(barter_id=self.barter_id)
        if barter is not None:
            barter.on_unlock(time=self.time)


class CancelBarterEvent(Event):
    def __init__(self, barter_id, agent, **kw):
        super(CancelBarterEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.barter_id = barter_id

    def on_perform(self):
        super(CancelBarterEvent, self).on_perform()
        barter = self.agent.get_barter_by_id(barter_id=self.barter_id)
        if barter is not None:
            barter.on_cancel(time=self.time)


class SuccessBarterEvent(Event):
    def __init__(self, barter, **kw):
        super(SuccessBarterEvent, self).__init__(server=barter.initiator.server, **kw)
        self.barter = barter

    def on_perform(self):
        super(SuccessBarterEvent, self).on_perform()
        self.barter.on_success(time=self.time)


class DoneBarterEvent(Event):
    def __init__(self, barter, success, **kw):
        super(DoneBarterEvent, self).__init__(server=barter.initiator.server, **kw)
        self.barter = barter
        self.success = success

    def on_perform(self):
        super(DoneBarterEvent, self).on_perform()
        pos_initiator = self.barter.initiator.car.position(self.time)
        pos_recipient = self.barter.recipient.car.position(self.time)
        if self.success:
            temp_pos = pos_initiator
            pos_initiator = pos_recipient
            pos_recipient = temp_pos

        # Создание контейнеров с невлезшими итемами
        if not self.barter.initiator_table.is_empty():
            CreatePOILootEvent(server=self.server, time=self.time, poi_cls=POIContainer, example=None,
                               inventory_size=self.barter.initiator_table.max_size, position=pos_initiator,
                               life_time=60.0, items=self.barter.initiator_table.get_items()).post()
        if not self.barter.recipient_table.is_empty():
            CreatePOILootEvent(server=self.server, time=self.time, poi_cls=POIContainer, example=None,
                               inventory_size=self.barter.recipient_table.max_size, position=pos_recipient,
                               life_time=60.0, items=self.barter.recipient_table.get_items()).post()

        # Удаление объектов-owner'ов для столов
        self.barter.initiator_table_obj.delete(time=self.time)
        self.barter.recipient_table_obj.delete(time=self.time)


class SetMoneyBarterEvent(Event):
    def __init__(self, barter_id, money, agent, **kw):
        super(SetMoneyBarterEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.barter_id = barter_id
        self.money = money

    def on_perform(self):
        super(SetMoneyBarterEvent, self).on_perform()
        barter = self.agent.get_barter_by_id(barter_id=self.barter_id)
        if barter is not None:
            barter.on_set_money(agent=self.agent, money=self.money, time=self.time)


class InviteBarterMessage(Message):
    def __init__(self, barter, **kw):
        super(InviteBarterMessage, self).__init__(**kw)
        self.barter = barter

    def as_dict(self):
        d = super(InviteBarterMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
            initiator=self.barter.initiator.login,
        )
        return d


class ActivateBarterMessage(Message):
    def __init__(self, barter, **kw):
        super(ActivateBarterMessage, self).__init__(**kw)
        self.barter = barter

    def as_dict(self):
        d = super(ActivateBarterMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
            initiator=self.barter.initiator.login,
            recipient=self.barter.recipient.login,
        )
        return d


class LockBarterMessage(Message):
    def __init__(self, barter, **kw):
        super(LockBarterMessage, self).__init__(**kw)
        self.barter = barter

    def as_dict(self):
        d = super(LockBarterMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
        )
        return d


class UnlockBarterMessage(Message):
    def __init__(self, barter, **kw):
        super(UnlockBarterMessage, self).__init__(**kw)
        self.barter = barter

    def as_dict(self):
        d = super(UnlockBarterMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
        )
        return d


class ChangeMoneyBarterMessage(Message):
    def __init__(self, barter, my_money, other_money, **kw):
        super(ChangeMoneyBarterMessage, self).__init__(**kw)
        self.barter = barter
        self.my_money = my_money
        self.other_money = other_money

    def as_dict(self):
        d = super(ChangeMoneyBarterMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
            my_money = self.my_money,
            other_money = self.other_money,
        )
        return d


class StartBarterTimerMessage(Message):
    def __init__(self, barter, **kw):
        super(StartBarterTimerMessage, self).__init__(**kw)
        self.barter = barter

    def as_dict(self):
        d = super(StartBarterTimerMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
            success_delay=self.barter.success_delay,
        )
        return d


class SuccessBarterMessage(Message):
    def __init__(self, barter, **kw):
        super(SuccessBarterMessage, self).__init__(**kw)
        self.barter = barter

    def as_dict(self):
        d = super(SuccessBarterMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
        )
        return d


class CancelBarterMessage(Message):
    def __init__(self, barter, **kw):
        super(CancelBarterMessage, self).__init__(**kw)
        self.barter = barter

    def as_dict(self):
        d = super(CancelBarterMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
        )
        return d


class BarterTable(Object):
    def __init__(self, barter, time, max_size, **kw):
        super(BarterTable, self).__init__(time=time, **kw)
        self.inventory = Inventory(owner=self, max_size=max_size, time=time)
        self.barter = barter

    def is_available(self, agent):
        return (agent is self.barter.initiator) or (agent is self.barter.recipient)


class Barter(object):
    id = property(id)

    def __init__(self, initiator, recipient, time):
        self.state = 'unactive'  # возможные состояния Бартера (unactive, active, lock)
        self.initiator = initiator
        self.recipient = recipient
        self.recipient_lock = False
        self.initiator_lock = False
        recipient.barters.append(self)
        initiator.barters.append(self)
        self.initiator_car = initiator.car
        self.recipient_car = recipient.car
        self.initiator_table = None
        self.recipient_table = None
        self.initiator_table_obj = None
        self.recipient_table_obj = None
        self.initiator_money = 0
        self.recipient_money = 0
        self.success_event = None
        self.success_delay = 5.0

        # Отправить приглашение
        InviteBarterMessage(agent=recipient, time=time, barter=self).post()

    def _change_table(self, inventory, time):
        if (inventory is self.initiator_table) or (inventory is self.recipient_table):
            self.on_unlock(time=time)

    def on_activate(self, recipient, time):
        if recipient is not self.recipient:  # todo: добавить проверку на расстояние, доступность машин
            return
        self.state = 'active'

        self.initiator_table_obj = BarterTable(server=self.initiator.server, time=time, barter=self,
                                             max_size=self.initiator_car.example.inventory_size)
        self.initiator_table = self.initiator_table_obj.inventory
        self.initiator_table.add_manager(agent=self.initiator)
        self.initiator_table.on_change_list.append(self._change_table)

        self.recipient_table_obj = BarterTable(server=self.recipient.server, time=time, barter=self,
                                             max_size=self.recipient_car.example.inventory_size)
        self.recipient_table = self.recipient_table_obj.inventory
        self.recipient_table.add_manager(agent=self.recipient)
        self.recipient_table.on_change_list.append(self._change_table)

        # Отправить сообщения об открытии окна
        ActivateBarterMessage(agent=self.initiator, barter=self, time=time).post()
        ActivateBarterMessage(agent=self.recipient, barter=self, time=time).post()

        # Вызвать событие on_trade_enter у агентов
        self.initiator.on_trade_enter(self.recipient)
        self.recipient.on_trade_enter(self.initiator)

        # todo: остановить обе машинки

    def on_lock(self, agent, time):
        if agent is self.initiator:
            self.initiator_lock = True
            self.initiator_table.del_manager(agent=self.initiator)
            LockBarterMessage(agent=self.initiator, barter=self, time=time).post()
        if agent is self.recipient:
            self.recipient_lock = True
            self.recipient_table.del_manager(agent=self.recipient)
            LockBarterMessage(agent=self.recipient, barter=self, time=time).post()

        # Создание ивента на завершение транзакции и отсылка сообщений об этом агентам
        if self.recipient_lock and self.initiator_lock:
            self.state = 'lock'
            StartBarterTimerMessage(agent=self.initiator, barter=self, time=time).post()
            StartBarterTimerMessage(agent=self.recipient, barter=self, time=time).post()
            self.success_event = SuccessBarterEvent(barter=self, time=time + self.success_delay)
            self.success_event.post()

    def on_unlock(self, time):
        self.initiator_lock = False
        self.recipient_lock = False
        self.recipient_table.add_manager(agent=self.recipient)
        self.initiator_table.add_manager(agent=self.initiator)
        self.state = 'active'

        UnlockBarterMessage(agent=self.initiator, barter=self, time=time).post()
        UnlockBarterMessage(agent=self.recipient, barter=self, time=time).post()

        if self.success_event:
            self.success_event.cancel()
            self.success_event = None

    def on_set_money(self, agent, money, time):
        self.on_unlock(time=time)
        if agent.example.balance < money:
            money = agent.example.balance
        if money < 0.0:
            money = 0                
        if agent is self.initiator:
            self.initiator_money = money
        else:
            self.recipient_money = money
        ChangeMoneyBarterMessage(agent=self.initiator, barter=self, my_money=self.initiator_money,
                                 other_money=self.recipient_money, time=time).post()
        ChangeMoneyBarterMessage(agent=self.recipient, barter=self, my_money=self.recipient_money,
                                 other_money=self.initiator_money, time=time).post()

    def on_success(self, time):
        self.initiator.car.inventory.add_inventory(inventory=self.recipient_table, time=time)
        self.recipient.car.inventory.add_inventory(inventory=self.initiator_table, time=time)

        # Обмен деньгами
        self.initiator.example.balance += self.recipient_money - self.initiator_money
        self.recipient.example.balance += self.initiator_money - self.recipient_money

        self.recipient.barters.remove(self)
        self.initiator.barters.remove(self)

        # Отправить сообщения о закрытии окон
        SuccessBarterMessage(agent=self.initiator, barter=self, time=time).post()
        SuccessBarterMessage(agent=self.recipient, barter=self, time=time).post()

        # Удалить бартер
        DoneBarterEvent(time=time + 0.2, barter=self, success=True).post()

    def on_cancel(self, time):
        if self.state == 'unactive':
            return
        self.initiator.car.inventory.add_inventory(inventory=self.initiator_table, time=time)
        self.recipient.car.inventory.add_inventory(inventory=self.recipient_table, time=time)

        self.recipient.barters.remove(self)
        self.initiator.barters.remove(self)

        # Отправить сообщения о закрытии окон
        CancelBarterMessage(agent=self.initiator, barter=self, time=time).post()
        CancelBarterMessage(agent=self.recipient, barter=self, time=time).post()

        # Удалить бартер
        DoneBarterEvent(time=time + 0.2, barter=self, success=False).post()

    def as_dict(self):
        pass




