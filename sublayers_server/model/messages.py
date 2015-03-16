# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from utils import time_log_format, serialize
from balance import BALANCE


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

    def __init__(self, agent, time=None, comment=None):
        """
        @param sublayers_server.model.utils.TimeClass time: Time of message post
        """
        if time is None:
            time = agent.server.get_time()
        super(Message, self).__init__()
        self.agent = agent
        self.time = time
        self.comment = comment

    def post(self):
        self.agent.server.post_message(self)

    def send(self):
        # todo: online status optimization
        connection = self.agent.connection
        log.debug('Send message: %s to %s', self, self.agent.login)
        if connection:
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


class Init(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def as_dict(self):
        d = super(Init, self).as_dict()
        d.update(
            agent=self.agent.as_dict(),
            cars=[car.as_dict(self.time) for car in self.agent.cars],
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
            author=self.author.as_dict(),
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
        if self.agent == obj.agent:
            if obj.cur_motion_task is not None:
                dict_update.update(target_point=obj.cur_motion_task.target_point)
        d.update(object=dict_update)
        return d


class Contact(Subjective):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] subj={self.subj}; obj={self.obj}>'

    def __init__(self, obj, is_boundary, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Object
        @param bool is_boundary: True if this contact about penetration into the visibility sphere
        """
        super(Contact, self).__init__(**kw)
        self.obj = obj
        self.is_boundary = is_boundary

    def as_dict(self):
        d = super(Subjective, self).as_dict()
        d.update(
            subject_id=self.subj.uid,
            is_boundary=self.is_boundary,
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
            object=self.obj.as_dict(to_time=self.time),  # todo: Serialize objects with private case
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


class Bang(Subjective):
    # todo: It is not subjective (IMHO)
    def __init__(self,
                 position,
                 bang_power=BALANCE.RocketBang.bang_power,
                 duration=BALANCE.RocketBang.duration,
                 end_duration=BALANCE.RocketBang.end_duration,
                 **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Sender of message
        # todo: right doctyping required
        """
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


class ZoneEffectMessage(Message):
    def __init__(self, subj, in_zone, zone_effect, **kw):
        super(ZoneEffectMessage, self).__init__(**kw)
        self.subj = subj
        self.in_zone = in_zone
        self.zone_effect = zone_effect

    def as_dict(self):
        d = super(ZoneEffectMessage, self).as_dict()
        d.update(
            subj=self.subj.uid,
            in_zone=self.in_zone,
            zone_effect=self.zone_effect,
            subj_cc=self.subj.p_cc.current,
            subj_r=self.subj._r
        )
        return d


class PartyIncludeMessage(Message):
    def __init__(self, subj, party, **kw):
        super(PartyIncludeMessage, self).__init__(**kw)
        self.subj = subj
        self.party = party

    def as_dict(self):
        d = super(PartyIncludeMessage, self).as_dict()
        d.update(
            subj=self.subj.as_dict(),
            party=self.party.as_dict(),
        )
        return d


class PartyExcludeMessage(Message):
    def __init__(self, subj, party, **kw):
        super(PartyExcludeMessage, self).__init__(**kw)
        self.subj = subj
        self.party = party

    def as_dict(self):
        d = super(PartyExcludeMessage, self).as_dict()
        d.update(
            subj=self.subj.as_dict(),
            party=self.party.as_dict(),
        )
        return d


class PartyInviteMessage(Message):
    def __init__(self, sender, recipient, party, **kw):
        super(PartyInviteMessage, self).__init__(**kw)
        self.sender = sender
        self.recipient = recipient
        self.party = party

    def as_dict(self):
        d = super(PartyInviteMessage, self).as_dict()
        d.update(
            sender=self.sender.uid,
            recipient=self.recipient.uid,
            party=self.party,
        )
        return d