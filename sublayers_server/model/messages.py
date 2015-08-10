# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.utils import time_log_format, serialize
from sublayers_server.model.balance import BALANCE


def make_push_package(events):
    serv_time = events[0].agent.server.get_time()
    events = [event.as_dict() for event in events]
    return dict(
        message_type='push',
        events=events,
        serv_time=serv_time,
    )


class Message(object):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}]>'

    def __init__(self, agent, time, comment=None):
        """
        @param sublayers_server.model.utils.TimeClass time: Time of message post
        """
        super(Message, self).__init__()
        assert time is not None, 'classname event is {}'.format(self.classname)
        self.time = time
        self.agent = agent
        self.comment = comment

    def post(self):
        if self.agent is not None:
            self.agent.server.post_message(self)

    def send(self):
        # todo: online status optimization
        connection = self.agent.connection
        # log.debug('Send message: %s to %s', self, self.agent.login)
        if connection.ws_connection:
            connection.send(serialize(make_push_package([self])))

    def __str__(self):
        return self.__str_template__.format(self=self)

    @property
    def time_str(self):
        return time_log_format(self.time)

    @property
    def classname(self):
        return self.__class__.__name__

    id = property(id)

    def as_dict(self):
        return dict(
            cls=self.classname,
            time=self.time,
            comment=self.comment,
        )


class InitTime(Message):
    pass


class Init(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def as_dict(self):
        d = super(Init, self).as_dict()
        d.update(
            agent=self.agent.as_dict(time=self.time),
            cars=[car.as_dict(time=self.time) for car in self.agent.cars],
        )
        return d


class Die(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'


class Chat(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] @{self.author} SAY "self.text">'

    def __init__(self, author, text=None, client_id=None, **kw):
        """
        @param sublayers_server.model.agents.Agent author: Sender of message
        @param unicode text: message text
        """
        super(Chat, self).__init__(**kw)
        self.author = author
        self.text = text
        self.client_id = client_id

    def as_dict(self):
        d = super(Chat, self).as_dict()
        d.update(
            author=self.author.as_dict(time=self.time),
            text=self.text,
            id=self.client_id,
        )
        return d


class Subjective(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] subj={self.subj}>'

    def __init__(self, subj, **kw):
        """
        @param sublayers_server.model.units.Unit subj: Sender of message
        """
        super(Subjective, self).__init__(**kw)
        self.subj = subj

    def as_dict(self):
        d = super(Subjective, self).as_dict()
        d.update(subject_id=self.subj.uid)
        return d


class Update(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] obj={self.obj}>'
    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Sender of message
        """
        super(Update, self).__init__(**kw)
        self.obj = obj

    def as_dict(self):
        d = super(Update, self).as_dict()
        # d.update(object=self.obj.as_dict())
        obj = self.obj
        dict_update = dict(
            uid=obj.uid,
            state=obj.state.export(),
            hp_state=obj.hp_state.export()
        )
        if self.agent == obj.owner:
            if obj.cur_motion_task is not None:
                dict_update.update(target_point=obj.cur_motion_task.target_point)
            dict_update.update(fuel_state=obj.fuel_state.export())
            dict_update.update(params=obj.get_params_dict())
        d.update(object=dict_update)
        return d


class Contact(Subjective):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] subj={self.subj}; obj={self.obj}>'

    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Object
        @param bool is_boundary: True if this contact about penetration into the visibility sphere
        """
        super(Contact, self).__init__(**kw)
        self.obj = obj

    def as_dict(self):
        d = super(Subjective, self).as_dict()
        d.update(
            subject_id=self.subj.uid,
        )
        return d


class See(Contact):

    def __init__(self, is_first, **kw):
        """
        @param bool is_first: True if this contact is first for that agent
        """
        super(See, self).__init__(**kw)
        self.is_first = is_first

    def as_dict(self):
        d = super(See, self).as_dict()
        d.update(
            object=self.obj.as_dict(time=self.time),  # todo: Serialize objects with private case
            is_first=self.is_first,
        )
        return d


class Out(Contact):

    def __init__(self, is_last, **kw):
        """
        @param bool is_last: True if this contact is last for that agent
        """
        super(Out, self).__init__(**kw)
        self.is_last = is_last

    def as_dict(self):
        d = super(Out, self).as_dict()
        d.update(
            object_id=self.obj.uid,
            is_last=self.is_last,
        )
        return d


class Bang(Message):
    def __init__(self,
                 position,
                 bang_power=BALANCE.RocketBang.bang_power,
                 duration=BALANCE.RocketBang.duration,
                 end_duration=BALANCE.RocketBang.end_duration,
                 **kw):
        super(Bang, self).__init__(**kw)
        self.position = position
        self.bang_power = bang_power
        self.duration = duration
        self.end_duration = end_duration

    def as_dict(self):
        d = super(Bang, self).as_dict()
        d.update(position=self.position,
                 bang_power=self.bang_power,
                 duration=self.duration,
                 end_duration=self.end_duration)
        return d


class FireDischarge(Message):
    def __init__(self, side, t_rch, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Sender of message
        """
        super(FireDischarge, self).__init__(**kw)
        self.side = side
        self.t_rch = t_rch

    def as_dict(self):
        d = super(FireDischarge, self).as_dict()
        d.update(
            side=self.side,
            t_rch=self.t_rch,
        )
        return d


class FireDischargeEffect(Message):
    def __init__(self, pos_subj, pos_obj, is_fake=False, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Sender of message
        """
        super(FireDischargeEffect, self).__init__(**kw)
        self.pos_subj = pos_subj
        self.pos_obj = pos_obj
        self.is_fake = is_fake

    def as_dict(self):
        d = super(FireDischargeEffect, self).as_dict()
        d.update(
            pos_subj=self.pos_subj,
            pos_obj=self.pos_obj,
            is_fake=self.is_fake,
        )
        return d


class FireAutoEffect(Message):
    def __init__(self, subj, obj, side=None, action=True, **kw):
        super(FireAutoEffect, self).__init__(**kw)
        self.subj = subj
        self.obj = obj
        self.side = side
        self.action = action

    def as_dict(self):
        d = super(FireAutoEffect, self).as_dict()
        d.update(
            subj=self.subj.uid,
            obj=self.obj.uid,
            side=self.side,
            action=self.action,
        )
        return d


class ZoneMessage(Message):
    def __init__(self, subj, name, is_start, **kw):
        super(ZoneMessage, self).__init__(**kw)
        self.subj = subj
        self.name = name
        self.is_start = is_start

    def as_dict(self):
        d = super(ZoneMessage, self).as_dict()
        d.update(
            subj=self.subj.uid,
            in_zone=self.name,
            is_start=self.is_start,
        )
        return d


class AgentPartyChangeMessage(Message):
    def __init__(self, subj, **kw):
        super(AgentPartyChangeMessage, self).__init__(**kw)
        self.subj = subj

    def as_dict(self):
        d = super(AgentPartyChangeMessage, self).as_dict()
        d.update(
            subj=self.subj.as_dict(time=self.time),
        )
        return d


class PartyIncludeMessageForIncluded(Message):
    def __init__(self, subj, party, **kw):
        super(PartyIncludeMessageForIncluded, self).__init__(**kw)
        self.subj = subj
        self.party = party

    def as_dict(self):
        d = super(PartyIncludeMessageForIncluded, self).as_dict()
        d.update(
            subj=self.subj.as_dict(time=self.time),
            party=self.party.as_dict(with_members=True),
        )
        return d


class PartyExcludeMessageForExcluded(Message):
    def __init__(self, subj, party, **kw):
        super(PartyExcludeMessageForExcluded, self).__init__(**kw)
        self.subj = subj
        self.party = party

    def as_dict(self):
        d = super(PartyExcludeMessageForExcluded, self).as_dict()
        d.update(
            subj=self.subj.as_dict(time=self.time),
            party=self.party.as_dict(),
        )
        return d


class PartyKickMessageForKicked(Message):
    def __init__(self, subj, party, **kw):
        super(PartyKickMessageForKicked, self).__init__(**kw)
        self.subj = subj
        self.party = party

    def as_dict(self):
        d = super(PartyKickMessageForKicked, self).as_dict()
        d.update(
            subj=self.subj.as_dict(time=self.time),
            party=self.party.as_dict(),
        )
        return d


class PartyInviteMessage(Message):
    def __init__(self, sender, recipient, party, invite, **kw):
        super(PartyInviteMessage, self).__init__(**kw)
        self.sender = sender
        self.recipient = recipient
        self.party = party
        self.invite = invite

    def as_dict(self):
        d = super(PartyInviteMessage, self).as_dict()
        d.update(
            sender=self.sender.as_dict(time=self.time),
            recipient=self.recipient.as_dict(time=self.time),
            party=self.party.as_dict(),
            invite_id=self.invite.id
        )
        return d


class PartyInviteDeleteMessage(Message):
    def __init__(self, sender, recipient, party, invite, **kw):
        super(PartyInviteDeleteMessage, self).__init__(**kw)
        self.sender = sender
        self.recipient = recipient
        self.party = party
        self.invite = invite

    def as_dict(self):
        d = super(PartyInviteDeleteMessage, self).as_dict()
        d.update(
            sender=self.sender.as_dict(time=self.time),
            recipient=self.recipient.as_dict(time=self.time),
            party=self.party.as_dict(),
            invite_id=self.invite.id
        )
        return d


class PartyErrorMessage(Message):
    pass


class ChangeAltitude(Message):
    def __init__(self, altitude, obj_id, **kw):
        super(ChangeAltitude, self).__init__(**kw)
        self.altitude = altitude
        self.obj_id = obj_id

    def as_dict(self):
        d = super(ChangeAltitude, self).as_dict()
        d.update(altitude=self.altitude,
                 obj_id=self.obj_id,
                 )
        return d


class EnterToLocation(Message):
    def __init__(self, location, **kw):
        super(EnterToLocation, self).__init__(**kw)
        self.location = location

    def as_dict(self):
        d = super(EnterToLocation, self).as_dict()
        d.update(
            location=self.location.as_dict(time=self.time)
            )
        return d


class ExitFromLocation(Message):
    def __init__(self, location, **kw):
        super(ExitFromLocation, self).__init__(**kw)
        self.location = location

    def as_dict(self):
        d = super(ExitFromLocation, self).as_dict()
        d.update(
            location=self.location.as_dict(time=self.time)
            )
        return d


class ChangeLocationVisitorsMessage(Message):
    def __init__(self, visitor_login, action, **kw):
        super(ChangeLocationVisitorsMessage, self).__init__(**kw)
        self.visitor_login = visitor_login
        self.action = action

    def as_dict(self):
        d = super(ChangeLocationVisitorsMessage, self).as_dict()
        d.update(
            visitor=self.visitor_login,
            action=self.action
            )
        return d


class ChatRoomMessage(Message):
    def __init__(self, msg, **kw):
        super(ChatRoomMessage, self).__init__(**kw)
        self.msg = msg

    def as_dict(self):
        d = super(ChatRoomMessage, self).as_dict()
        d.update(
            room_name=self.msg.chat_name,
            msg=self.msg.text,
            sender=self.msg.sender_login,
            msg_time=self.msg.time,
            )
        return d


class ChatRoomIncludeMessage(Message):
    def __init__(self, room_name, chat_type=None, **kw):
        super(ChatRoomIncludeMessage, self).__init__(**kw)
        self.room_name = room_name
        self.chat_type = chat_type

    def as_dict(self):
        d = super(ChatRoomIncludeMessage, self).as_dict()
        d.update(
            room_name=self.room_name,
            chat_type=self.chat_type
            )
        return d


class ChatRoomExcludeMessage(Message):
    def __init__(self, room_name, **kw):
        super(ChatRoomExcludeMessage, self).__init__(**kw)
        self.room_name = room_name

    def as_dict(self):
        d = super(ChatRoomExcludeMessage, self).as_dict()
        d.update(
            room_name=self.room_name,
            )
        return d


class ChatPartyRoomIncludeMessage(ChatRoomIncludeMessage):
    pass


class ChatPartyRoomExcludeMessage(ChatRoomExcludeMessage):
    pass


class InventoryShowMessage(Message):
    def __init__(self, inventory, **kw):
        super(InventoryShowMessage, self).__init__(**kw)
        self.inventory = inventory

    def as_dict(self):
        d = super(InventoryShowMessage, self).as_dict()
        d.update(
            inventory=self.inventory.as_dict()
            )
        return d


class InventoryHideMessage(Message):
    def __init__(self, inventory, **kw):
        super(InventoryHideMessage, self).__init__(**kw)
        self.inventory = inventory

    def as_dict(self):
        d = super(InventoryHideMessage, self).as_dict()
        d.update(
            inventory_owner_id=self.inventory.owner.uid
            )
        return d


class InventoryItemMessage(Message):
    def __init__(self, item, inventory, position, **kw):
        super(InventoryItemMessage, self).__init__(**kw)
        self.item = item
        self.inventory = inventory
        self.position = position

    def as_dict(self):
        d = super(InventoryItemMessage, self).as_dict()
        d.update(
            item=self.item.export_item_state(),
            position=self.position,
            owner_id=self.inventory.owner.uid,
            )
        return d


class InventoryAddItemMessage(InventoryItemMessage):
    pass


class InventoryDelItemMessage(InventoryItemMessage):
    pass


class BalanceClsInfo(Message):
    def __init__(self, balance_cls_name, **kw):
        super(BalanceClsInfo, self).__init__(**kw)
        self.balance_cls_name = balance_cls_name

    def as_dict(self):
        d = super(BalanceClsInfo, self).as_dict()
        d.update(
            balance_cls={
                'name': self.balance_cls_name.name,
            }
        )
        return d


class GasStationUpdate(Message):
    def as_dict(self):
        d = super(GasStationUpdate, self).as_dict()
        d.update(
            balance=self.agent.example.balance,
            fuel=self.agent.example.car.fuel,
        )
        return d


class ExamplesShowMessage(Message):
    def as_dict(self):
        d = super(ExamplesShowMessage, self).as_dict()

        example10 = self.agent.server.reg['/items/usable/fuel/tanks/tank_empty/tank10']
        example20 = self.agent.server.reg['/items/usable/fuel/tanks/tank_empty/tank20']

        empty_tank10 = dict(
            cls='ItemState',
            balance_cls='tank10',
            example=example10.as_client_dict(),
            max_val=1,
            t0=self.time,
            val0=1,
            dvs=0,
        )

        empty_tank20 = dict(
            cls='ItemState',
            balance_cls='tank20',
            example=example20.as_client_dict(),
            max_val=1,
            t0=self.time,
            val0=1,
            dvs=0,
        )

        d.update(
            # slots=[{v[0]:v[1].as_client_dict()} for v in self.agent.example.car.iter_slots()], # довести до ума
            armorer_slots=[
                {
                    'name': 'slot_FC',
                    'value': example10.as_client_dict()
                },
                {
                    'name': 'slot_CC',
                    'value': None
                },
                {
                    'name': 'slot_BR',
                    'value': None
                },
                {
                    'name': 'slot_BL',
                    'value': None
                },
            ],
            inventory=dict(
                max_size=10,
                items=[
                    {
                        'item': empty_tank10,
                        'position': 1
                    },
                    {
                        'item': empty_tank20,
                        'position': 2
                    },
                    {
                        'item': empty_tank10,
                        'position': 4
                    }
                ],
                owner_id=self.agent.uid
            )
        )
        return d


class ExamplesHideMessage(Message):
    def as_dict(self):
        d = super(ExamplesHideMessage, self).as_dict()
        d.update(
            inventory_owner_id=self.agent.uid
            )
        return d