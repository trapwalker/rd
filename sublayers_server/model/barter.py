# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)
from sublayers_server.model.inventory import Inventory
from sublayers_server.model.events import Event, event_deco
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
        recipient = self.server.agents_by_name.get(str(self.recipient_login), None)
        if not recipient:
            return

        for barter in self.initiator.barters:
            # Проверить нет ли уже приглашения для этого пользователя и если есть то новое не создавать
            if barter.recipient is recipient:
                return
            # Проверить нет ли уже приглашения от оппонента и если есть то принять его
            if barter.initiator is recipient:
                barter.activate.sync(self=barter, event=self, recipient=self.initiator)
                return

        if Barter.can_make_barter(agent1=self.initiator, agent2=recipient, time=self.time):
            Barter(initiator=self.initiator, recipient=recipient, time=self.time)


class AddInviteBarterMessage(Message):
    def __init__(self, barter, **kw):
        super(AddInviteBarterMessage, self).__init__(**kw)
        self.barter = barter

    def as_dict(self):
        d = super(AddInviteBarterMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
            initiator=self.barter.initiator.user.name,
        )
        return d


class DelInviteBarterMessage(Message):
    def __init__(self, barter, **kw):
        super(DelInviteBarterMessage, self).__init__(**kw)
        self.barter = barter

    def as_dict(self):
        d = super(DelInviteBarterMessage, self).as_dict()
        d.update(
            barter_id=self.barter.id,
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
            initiator=self.barter.initiator.user.name,
            recipient=self.barter.recipient.user.name,
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
        d.update(barter_id=self.barter.id)
        return d


class BarterTable(Object):
    def __init__(self, barter, time, max_size, **kw):
        super(BarterTable, self).__init__(time=time, **kw)
        self.inventory = Inventory(owner=self, max_size=max_size)
        self.barter = barter

    def is_available(self, agent):
        return (agent is self.barter.initiator) or (agent is self.barter.recipient)


class Barter(object):
    id = property(id)
    barter_distance = 50

    def __init__(self, initiator, recipient, time):
        self.state = 'unactive'  # возможные состояния Бартера (unactive, active, lock)
        self.server = initiator.server
        self.initiator = initiator
        self.recipient = recipient
        self.recipient_lock = False
        self.initiator_lock = False
        recipient.barters.append(self)
        initiator.barters.append(self)

        if self.initiator.current_location is None:
            self.initiator_inv = initiator.car.inventory
            self.recipient_inv = recipient.car.inventory
        else:
            self.initiator_inv = initiator.inventory
            self.recipient_inv = recipient.inventory

        self.initiator_table = None
        self.recipient_table = None
        self.initiator_table_obj = None
        self.recipient_table_obj = None
        self.initiator_money = 0
        self.recipient_money = 0
        self.success_delay = 5.0
        self.timeout_delay = 60.0
        self.success_event = None
        self.timeout_event = self.cancel(time=time + self.timeout_delay)
        self.is_cancel = False  # Вызван ли cancel

        # Отправить приглашение
        AddInviteBarterMessage(agent=recipient, time=time, barter=self).post()

    @classmethod
    def can_make_barter(cls, agent1, agent2, time):
        if not (agent1.current_location is agent1.current_location) or (agent1 is agent2):
            return False
        if agent1.current_location is None:
            car1 = agent1.car
            car2 = agent2.car
            if (car1 is None) or (car2 is None):
                return False
            return car1.position(time=time).distance(target=car2.position(time=time)) <= cls.barter_distance
        else:
            return (agent1.inventory is not None) and (agent2.inventory is not None)

    @classmethod
    def get_barter(cls, agent, barter_id=None, recipient_login=None):
        if barter_id is not None:
            for barter in agent.barters:
                if barter.id == barter_id:
                    return barter
        if recipient_login is not None:
            for barter in agent.barters:
                if barter.recipient.user.name == recipient_login:
                    return barter
        return None

    def _change_table(self, inventory, time):
        if (inventory is self.initiator_table) or (inventory is self.recipient_table):
            self.unlock(time=time)

    def is_active(self):
        return self.state in ['active', 'lock']

    @event_deco
    def activate(self, event, recipient):
        if recipient is not self.recipient:  # todo: добавить проверку на расстояние, доступность машин
            return

        self.state = 'active'
        self.timeout_event.cancel()

        self.initiator_table_obj = BarterTable(server=self.initiator.server, time=event.time, barter=self,
                                               max_size=self.initiator_inv.example.size)
        self.initiator_table = self.initiator_table_obj.inventory
        self.initiator_table.add_manager(agent=self.initiator)
        self.initiator_table.on_change_list.append(self._change_table)

        self.recipient_table_obj = BarterTable(server=self.recipient.server, time=event.time, barter=self,
                                               max_size=self.recipient_inv.example.size)
        self.recipient_table = self.recipient_table_obj.inventory
        self.recipient_table.add_manager(agent=self.recipient)
        self.recipient_table.on_change_list.append(self._change_table)

        # Отправить сообщения об открытии окна b
        ActivateBarterMessage(agent=self.initiator, barter=self, time=event.time).post()
        ActivateBarterMessage(agent=self.recipient, barter=self, time=event.time).post()
        DelInviteBarterMessage(agent=self.recipient, barter=self, time=event.time).post()

        # Вызвать событие on_trade_enter у агентов
        self.recipient.on_trade_enter(contragent=self.initiator, time=event.time, is_init=True)
        self.initiator.on_trade_enter(contragent=self.recipient, time=event.time, is_init=False)

        # todo: остановить обе машинки

    @event_deco
    def lock(self, event, agent):
        if agent is self.initiator:
            self.initiator_lock = True
            self.initiator_table.del_manager(agent=self.initiator)
            LockBarterMessage(agent=self.initiator, barter=self, time=event.time).post()
        if agent is self.recipient:
            self.recipient_lock = True
            self.recipient_table.del_manager(agent=self.recipient)
            LockBarterMessage(agent=self.recipient, barter=self, time=event.time).post()

        # Создание ивента на завершение транзакции и отсылка сообщений об этом агентам
        if self.recipient_lock and self.initiator_lock:
            self.state = 'lock'
            StartBarterTimerMessage(agent=self.initiator, barter=self, time=event.time).post()
            StartBarterTimerMessage(agent=self.recipient, barter=self, time=event.time).post()
            self.success_event = self.success(time=event.time + self.success_delay)

    @event_deco
    def unlock(self, event):
        self.initiator_lock = False
        self.recipient_lock = False
        self.recipient_table.add_manager(agent=self.recipient)
        self.initiator_table.add_manager(agent=self.initiator)
        self.state = 'active'

        UnlockBarterMessage(agent=self.initiator, barter=self, time=event.time).post()
        UnlockBarterMessage(agent=self.recipient, barter=self, time=event.time).post()

        if self.success_event:
            self.success_event.cancel()
            self.success_event = None

    @event_deco
    def set_money(self, event, agent, money):
        self.unlock(time=event.time)
        if agent.balance < money:
            money = agent.balance
        if money < 0.0:
            money = 0                
        if agent is self.initiator:
            self.initiator_money = money
        else:
            self.recipient_money = money
        ChangeMoneyBarterMessage(agent=self.initiator, barter=self, my_money=self.initiator_money,
                                 other_money=self.recipient_money, time=event.time).post()
        ChangeMoneyBarterMessage(agent=self.recipient, barter=self, my_money=self.recipient_money,
                                 other_money=self.initiator_money, time=event.time).post()

    @event_deco
    def success(self, event):
        if self.is_cancel or self.state != 'lock':
            return

        if ((self.initiator.balance < self.initiator_money) or
            (self.recipient.balance < self.recipient_money) or
            (not Barter.can_make_barter(agent1=self.initiator, agent2=self.recipient, time=event.time))):
            self.cancel.sync(self=self, event=event)
            return

        self.initiator_inv.add_inventory(inventory=self.recipient_table, time=event.time)
        self.recipient_inv.add_inventory(inventory=self.initiator_table, time=event.time)

        # Обмен деньгами
        self.initiator.example.set_balance(time=event.time, delta=self.recipient_money - self.initiator_money)
        self.recipient.example.set_balance(time=event.time, delta=self.initiator_money - self.recipient_money)

        # Отправить сообщения о закрытии окон
        SuccessBarterMessage(agent=self.initiator, barter=self, time=event.time).post()
        SuccessBarterMessage(agent=self.recipient, barter=self, time=event.time).post()

        # Удалить бартер
        self.state = 'success'
        self.done(time=event.time)

    @event_deco
    def cancel(self, event):
        if self.is_cancel:
             return
        self.is_cancel = True

        if (self.state == 'active') or (self.state == 'lock'):
            self.initiator_inv.add_inventory(inventory=self.initiator_table, time=event.time)
            self.recipient_inv.add_inventory(inventory=self.recipient_table, time=event.time)

            # Отправить сообщения о закрытии окон
            CancelBarterMessage(agent=self.initiator, barter=self, time=event.time).post()
            CancelBarterMessage(agent=self.recipient, barter=self, time=event.time).post()

        # Удалить бартер
        self.done(time=event.time)

    @event_deco
    def done(self, event):
        DelInviteBarterMessage(agent=self.recipient, barter=self, time=event.time).post()
        if self in self.recipient.barters:
            self.recipient.barters.remove(self)
        if self in self.initiator.barters:
            self.initiator.barters.remove(self)
        if ((self.initiator_table is not None) and (self.recipient_table is not None) and
            (self.initiator_table_obj is not None) and (self.recipient_table_obj is not None)):

            # todo: решить вопрос с переполнением инвентаря в городе
            if self.initiator.car and self.recipient.car:
                pos_initiator = self.initiator.car.position(event.time)
                pos_recipient = self.recipient.car.position(event.time)
                if self.state == 'success':
                    temp_pos = pos_initiator
                    pos_initiator = pos_recipient
                    pos_recipient = temp_pos

                # Создание контейнеров с невлезшими итемами
                if not self.initiator_table.is_empty():
                    CreatePOILootEvent(server=self.server, time=event.time, poi_cls=POIContainer, example=None,
                                       inventory_size=self.initiator_table.max_size, position=pos_initiator,
                                       life_time=60.0, items=self.initiator_table.get_items()).post()
                if not self.recipient_table.is_empty():
                    CreatePOILootEvent(server=self.server, time=event.time, poi_cls=POIContainer, example=None,
                                       inventory_size=self.recipient_table.max_size, position=pos_recipient,
                                       life_time=60.0, items=self.recipient_table.get_items()).post()

            # Удаление объектов-owner'ов для столов
            self.initiator_table_obj.delete(time=event.time)
            self.recipient_table_obj.delete(time=event.time)

    def as_dict(self):
        pass




