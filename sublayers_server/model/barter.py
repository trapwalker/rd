# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)
from sublayers_server.model.inventory import Inventory
from sublayers_server.model.events import Event
from sublayers_server.model.messages import Message
from sublayers_server.model.base import Object


class InitBarterEvent(Event):
    def __init__(self, initiator, recipient_login, **kw):
        super(InitBarterEvent, self).__init__(server=initiator.server, **kw)
        self.initiator = initiator
        self.recipient_login = recipient_login

    def on_perform(self):
        super(InitBarterEvent, self).on_perform()
        recipient = self.server.agents.get(self.recipient_login, None)
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
        self.initiatorTable = None
        self.recipientTable = None
        self.initiatorTableObj = None
        self.recipientTableObj = None
        self.success_event = None
        self.success_delay = 5.0

        # Отправить приглашение
        InviteBarterMessage(agent=recipient, time=time, barter=self).post()

    def _change_table(self, inventory, time):
        if (inventory is self.initiatorTable) or (inventory is self.recipientTable):
            self.on_unlock(time=time)

    def on_activate(self, recipient, time):
        if recipient is not self.recipient:  # todo: добавить проверку на расстояние, доступность машин
            return
        self.state = 'active'

        self.initiatorTableObj = BarterTable(server=self.initiator.server, time=time, barter=self,
                                             max_size=self.initiator_car.example.inventory_size)
        self.initiatorTable = self.initiatorTableObj.inventory
        self.initiatorTable.add_manager(agent=self.initiator)
        self.initiatorTable.on_change_list.append(self._change_table)

        self.recipientTableObj = BarterTable(server=self.recipient.server, time=time, barter=self,
                                             max_size=self.recipient_car.example.inventory_size)
        self.recipientTable = self.recipientTableObj.inventory
        self.recipientTable.add_manager(agent=self.recipient)
        self.recipientTable.on_change_list.append(self._change_table)

        # Отправить сообщения об открытии окна
        ActivateBarterMessage(agent=self.initiator, barter=self, time=time).post()
        ActivateBarterMessage(agent=self.recipient, barter=self, time=time).post()

        # todo: остановить обе машинки

    def on_lock(self, agent, time):
        if agent is self.initiator:
            self.initiator_lock = True
            self.initiatorTable.del_manager(agent=self.initiator)
            LockBarterMessage(agent=self.initiator, barter=self, time=time).post()
        if agent is self.recipient:
            self.recipient_lock = True
            self.recipientTable.del_manager(agent=self.recipient)
            LockBarterMessage(agent=self.recipient, barter=self, time=time).post()

        # Создание ивента на завершение транзакции и отсылка сообщений об этом агентам
        if self.recipient_lock and self.initiator_lock:
            self.state = 'lock'
            self.success_event = SuccessBarterEvent(barter=self, time=time + self.success_delay)
            self.success_event.post()

    def on_unlock(self, time):
        self.initiator_lock = False
        self.recipient_lock = False
        self.recipientTable.add_manager(agent=self.recipient)
        self.initiatorTable.add_manager(agent=self.initiator)
        self.state = 'active'

        UnlockBarterMessage(agent=self.initiator, barter=self, time=time).post()
        UnlockBarterMessage(agent=self.recipient, barter=self, time=time).post()

        if self.success_event:
            self.success_event.cancel()
            self.success_event = None

    def on_success(self, time):
        self.initiator.car.inventory.add_inventory(inventory=self.recipientTable, time=time)
        self.recipient.car.inventory.add_inventory(inventory=self.initiatorTable, time=time)
        # todo: отправить сообщения о закрытии окон

    def on_cancel(self, time):
        if self.state == 'unactive':
            return
        self.initiator.car.inventory.add_inventory(inventory=self.initiatorTable, time=time)
        self.recipient.car.inventory.add_inventory(inventory=self.recipientTable, time=time)
        # todo: отправить сообщения о закрытии окон

    def as_dict(self):
        pass




