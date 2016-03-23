# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.inventory import Consumer
from sublayers_server.model.events import Event, event_deco
from sublayers_server.model.messages import Message


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
    def __init__(self, owner):
        super(QuickItem, self).__init__(server=owner.owner.server, dv=0, ddvs=0)
        self.owner = owner

    def can_set(self, item):
        return item.example.activate() is not None

    def set_item(self, time, **kw):
        super(QuickItem, self).set_item(time=time, **kw)
        QuickConsumerPanelMessageEvent(owner=self.owner, time=time + 0.1).post()


class QuickConsumerPanel(object):
    def __init__(self, owner):
        super(QuickConsumerPanel, self).__init__()
        self.owner = owner
        self.server = self.owner.server
        self.quick_items = {
            1: QuickItem(owner=self),
            2: QuickItem(owner=self),
            3: QuickItem(owner=self),
            4: QuickItem(owner=self),
        }

    @event_deco
    def set_item(self, event, index, position):
        if index in self.quick_items:
            item = None
            if position is not None:
                item = self.owner.inventory.get_item(position=position)
            self.quick_items[index].set_item(item=item, time=event.time)

    @event_deco
    def activate_item(self, event, index, target_id):
        if index in self.quick_items:
            item = self.quick_items[index].item
            if item is None:
                return
            event_cls = item.example.activate()
            if event_cls:
                event_cls(server=self.owner.server, time=event.time, item=item,
                          inventory=self.owner.inventory, target=target_id).post()
            QuickConsumerPanelMessageEvent(owner=self, time=event.time + 0.1).post()

    @event_deco
    def swap_items(self, event, index1, index2):
        if (index1 in self.quick_items) and (index2 in self.quick_items):
            item1 = self.quick_items[index1].item
            item2 = self.quick_items[index2].item
            self.quick_items[index1].set_item(item=item2, time=event.time)
            self.quick_items[index2].set_item(item=item1, time=event.time)

    def as_dict(self, time):
        return dict(
            items=[dict({'index': index,
                         'item': None if self.quick_items[index].item is None else self.quick_items[index].item.export_item_state()}) for index in self.quick_items]
        )
