# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.inventory import Consumer
from sublayers_server.model.events import Event
from sublayers_server.model.messages import Message


class QuickItemActivateEvent(Event):
    def __init__(self, owner, index, target_id, **kw):
        super(QuickItemActivateEvent, self).__init__(server=owner.owner.server, **kw)
        self.owner = owner
        self.index = index
        self.target_id = target_id

    def on_perform(self):
        super(QuickItemActivateEvent, self).on_perform()
        self.owner.on_activate_item(index=self.index, target_id=self.target_id, time=self.time)


class SetQuickItemEvent(Event):
    def __init__(self, owner, index, position, **kw):
        super(SetQuickItemEvent, self).__init__(server=owner.owner.server, **kw)
        self.owner = owner
        self.index = index
        self.position = position

    def on_perform(self):
        super(SetQuickItemEvent, self).on_perform()
        self.owner.on_set_item(index=self.index, position=self.position, time=self.time)


class QuickConsumerPanelInfoMessage(Message):
    def __init__(self, owner, **kw):
        super(QuickConsumerPanelInfoMessage, self).__init__(agent=owner.owner.main_agent, **kw)
        self.owner = owner

    def as_dict(self):
        d = super(QuickConsumerPanelInfoMessage, self).as_dict()
        d.update(quick_panel=self.owner.as_dict(time=self.time))
        return d


class QuickConsumerPanelMessageEvent(Event):
    def __init__(self, owner, **kw):
        super(QuickConsumerPanelMessageEvent, self).__init__(server=owner.owner.server, **kw)
        self.owner = owner

    def on_perform(self):
        super(QuickConsumerPanelMessageEvent, self).on_perform()
        QuickConsumerPanelInfoMessage(owner=self.owner, time=self.time).post()


class QuickItem(Consumer):
    def __init__(self, server):
        super(QuickItem, self).__init__(server=server, dv=0, ddvs=0)

    def can_set(self, item):
        return item.example.activate() is not None


class QuickConsumerPanel(object):
    def __init__(self, owner):
        super(QuickConsumerPanel, self).__init__()
        self.owner = owner
        self.quick_items = {
            1: QuickItem(server=owner.server),
            2: QuickItem(server=owner.server),
            3: QuickItem(server=owner.server),
            4: QuickItem(server=owner.server),
        }

    def activate_item(self, index, target_id, time):
        QuickItemActivateEvent(owner=self, index=index, target_id=target_id, time=time).post()

    def set_item(self, index, position, time):
        SetQuickItemEvent(owner=self, index=index, position=position, time=time).post()

    def on_set_item(self, index, position, time):
        if index in self.quick_items:
            item = None
            if position is not None:
                item = self.owner.inventory.get_item(position=position)
            self.quick_items[index].set_item(item=item, time=time)
            QuickConsumerPanelMessageEvent(owner=self, time=time + 0.1).post()

    def on_activate_item(self, index, target_id, time):
        if index in self.quick_items:
            item = self.quick_items[index].item
            if item is None:
                return
            event_cls = item.example.activate()
            if event_cls:
                event_cls(server=self.owner.server, time=time, item=item,
                          inventory=self.owner.inventory, target=target_id).post()
            QuickConsumerPanelMessageEvent(owner=self, time=time + 0.1).post()

    def as_dict(self, time):
        return dict(
            items=[dict({'index': index,
                         'item': None if self.quick_items[index].item is None else self.quick_items[index].item.export_item_state()}) for index in self.quick_items]
        )
