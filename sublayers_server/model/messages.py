# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.utils import time_log_format, serialize
from sublayers_server.model.balance import BALANCE

import os.path
import tornado.template
from tornado.options import options

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
        # log.debug('Send message: %s to %r', self, self.agent.user.name)
        if connection:
            if connection.ws_connection:
                connection.send(serialize(make_push_package([self])))
        else:
            log.debug('Connection not found for agent %s', self.agent.user.name)

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


class InitAgent(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def as_dict(self):
        d = super(InitAgent, self).as_dict()
        d.update(
            agent=self.agent.as_dict(time=self.time)
        )
        return d


class InitCar(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def as_dict(self):
        d = super(InitCar, self).as_dict()
        d.update(
            car=self.agent.car.as_dict(time=self.time),
        )
        return d


class Die(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'


class QuickGameDie(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.agents.Agent author: Sender of message
        @param unicode text: message text
        """
        super(QuickGameDie, self).__init__(**kw)
        self.obj = obj

    def as_dict(self):
        d = super(QuickGameDie, self).as_dict()
        d.update(
            object=self.obj.as_dict(time=self.time),
        )
        return d


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


class UpdateObservingRange(Message):
    def __init__(self, obj, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Sender of message
        """
        super(UpdateObservingRange, self).__init__(**kw)
        self.obj = obj

    def as_dict(self):
        d = super(UpdateObservingRange, self).as_dict()
        d.update(
            p_observing_range=self.obj.params.get('p_observing_range').current,
            obj_id=self.obj.uid,
        )
        return d


class SetObserverForClient(Message):
    def __init__(self, obj, enable, **kw):
        super(SetObserverForClient, self).__init__(**kw)
        self.obj = obj
        self.enable = enable

    def as_dict(self):
        d = super(SetObserverForClient, self).as_dict()
        d.update(obj_id=self.obj.uid, enable=self.enable)
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
    def __init__(
        self,
        position,
        bang_power=BALANCE.RocketBang.bang_power,
        duration=BALANCE.RocketBang.duration,
        end_duration=BALANCE.RocketBang.end_duration,
        **kw
    ):
        super(Bang, self).__init__(**kw)
        self.position = position
        self.bang_power = bang_power
        self.duration = duration
        self.end_duration = end_duration

    def as_dict(self):
        d = super(Bang, self).as_dict()
        d.update(
            position=self.position,
            bang_power=self.bang_power,
            duration=self.duration,
            end_duration=self.end_duration,
        )
        return d


class FireDischarge(Message):
    def __init__(self, side, t_rch, car_id, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Sender of message
        """
        super(FireDischarge, self).__init__(**kw)
        self.side = side
        self.t_rch = t_rch
        self.car_id = car_id

    def as_dict(self):
        d = super(FireDischarge, self).as_dict()
        d.update(
            side=self.side,
            t_rch=self.t_rch,
            car_id=self.car_id
        )
        return d


class FireDischargeEffect(Message):
    def __init__(self, pos_subj, targets, fake_position, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Sender of message
        """
        super(FireDischargeEffect, self).__init__(**kw)
        self.pos_subj = pos_subj
        self.targets = targets
        self.fake_position = fake_position


    def as_dict(self):
        d = super(FireDischargeEffect, self).as_dict()
        d.update(
            pos_subj=self.pos_subj,
            targets=self.targets,
            fake_position=self.fake_position,
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
        d.update(
            altitude=self.altitude,
            obj_id=self.obj_id,
        )
        return d


def patch_svg_links(src, pth):
    import re
    r = re.compile(r'(xlink:href=")(.*.(jpg|png)")')  # todo: opimize
    return r.sub(r'\1{}\2'.format(pth), src)


class EnterToLocation(Message):
    def __init__(self, location, agent, **kw):
        super(EnterToLocation, self).__init__(agent=agent, **kw)
        self.location = location
        self.agent = agent

    def as_dict(self):
        d = super(EnterToLocation, self).as_dict()

        agent = self.agent
        location = self.location

        svg_link = os.path.join(os.path.join(options.static_path, '..'), location.example.svg_link)
        svg_code = ''
        with open(os.path.join(svg_link, 'location.svg')) as f:
            svg_code = f.read()
            svg_code = patch_svg_links(src=svg_code, pth=(location.example.svg_link + '/'))

        from sublayers_server.model.map_location import Town, GasStation
        location_html = None
        if isinstance(location, Town):
            location_html = tornado.template.Loader(
                root_directory="templates/location",
                namespace=self.agent.connection.get_template_namespace()
            ).load("town_new.html").generate(town=location, svg_code=svg_code)
        elif isinstance(location, GasStation):
            location_html = tornado.template.Loader(
                root_directory="templates/location",
                namespace=self.agent.connection.get_template_namespace()
            ).load("gas_station.html").generate(station=location, svg_code=svg_code, agent=agent)
        else:
            log.warn('Unknown type location: %s', location)
        d.update(
            location=self.location.as_dict(time=self.time),
            location_html=location_html,
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
    def __init__(self, inventory_id, **kw):
        super(InventoryHideMessage, self).__init__(**kw)
        self.inventory_id = inventory_id

    def as_dict(self):
        d = super(InventoryHideMessage, self).as_dict()
        d.update(
            inventory_owner_id=self.inventory_id
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


class InventoryIncSizeMessage(Message):
    def __init__(self, inventory, **kw):
        super(InventoryIncSizeMessage, self).__init__(**kw)
        self.inventory = inventory

    def as_dict(self):
        d = super(InventoryIncSizeMessage, self).as_dict()
        d.update(
            size=self.inventory.max_size,
            inventory_owner_id=self.inventory.owner.uid,
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

        d['agent_balance'] = self.agent.example.balance

        if self.agent.example.car:
            d['example_car_node'] = self.agent.example.car.node_hash()
            d['example_car_image_scale'] = self.agent.example.car.image_scale

            d['armorer_slots'] = [
                dict(name=k, value=v and v.as_client_dict())
                for k, v in self.agent.example.car.iter_slots(tags='armorer')
            ]

            d['mechanic_slots'] = [
                dict(name=k, value=v and v.as_client_dict(), tags=[el for el in attr.tags])
                for k, v, attr in self.agent.example.car.iter_slots2(tags='mechanic')
            ]

            d['tuner_slots'] = [
                dict(name=k, value=v and v.as_client_dict(), tags=[el for el in attr.tags])
                for k, v, attr in self.agent.example.car.iter_slots2(tags='tuner')
            ]

            d['armorer_slots_flags'] = [
                dict(name=attr.name, value=getter and getter())
                for attr, getter in self.agent.example.car.iter_attrs(tags='slot_limit')
            ]

            d['inventory'] = dict(
                max_size=self.agent.example.car.inventory_size,
                items=[
                    dict(
                        position=ex.position,
                        item=dict(
                            cls='ItemState',
                            balance_cls=ex.parent.node_hash(),
                            example=ex.as_client_dict(),
                            max_val=ex.stack_size,
                            t0=self.time,
                            val0=ex.amount,
                            dvs=0,
                        )
                    )
                    for ex in self.agent.example.car.inventory
                ],
                owner_id=self.agent.uid
            )

        return d


class QuestUpdateMessage(Message):
    def __init__(self, quest, **kw):
        super(QuestUpdateMessage, self).__init__(**kw)
        self.quest = quest

    def as_dict(self):
        d = super(QuestUpdateMessage, self).as_dict()
        d['quest'] = self.quest.as_client_dict()
        return d


class TraderInventoryShowMessage(Message):
    # todo: переделать этот кошмар
    def __init__(self, town_id, **kw):
        super(TraderInventoryShowMessage, self).__init__(**kw)
        self.town_id = town_id
        self.position = 0

    def _get_position(self):
        self.position += 1
        return self.position - 1

    def as_dict(self):
        d = super(TraderInventoryShowMessage, self).as_dict()

        # Получаем сервер и экземпляр торговца
        server = self.agent.server
        trader = server.objects[self.town_id].example.trader

        # Отправка инвентаря торговца
        d['inventory'] = dict(
                max_size=trader.inventory_size,
                items=[
                    dict(
                        position=self._get_position(),
                        item=dict(
                            cls='ItemState',
                            balance_cls=None,
                            example=server.reg[ex].as_client_dict(),
                            max_val=server.reg[ex].stack_size,
                            t0=self.time,
                            val0=server.reg[ex].stack_size,
                            dvs=0,
                        )
                    ) for ex in trader.inventory
                ],
                owner_id=str(self.town_id) + '_trader'
            )

        # Отправка цен
        car_inventory = ()
        if self.agent.example.car:
            car_inventory = self.agent.example.car.inventory
        d['price'] = trader.as_client_dict(items=car_inventory)

        return d


class SetupTraderReplica(Message):
    def __init__(self, replica, **kw):
        super(SetupTraderReplica, self).__init__(**kw)
        self.replica = replica

    def as_dict(self):
        d = super(SetupTraderReplica, self).as_dict()
        d.update(
            replica=self.replica,
        )
        return d


class AddExperienceMessage(Message):
    def as_dict(self):
        d = super(AddExperienceMessage, self).as_dict()
        d.update(
            exp_agent=self.agent.stat_log.get_metric('exp'),
            exp_car=self.agent.car.stat_log.get_metric('exp'),
            frag_agent=self.agent.stat_log.get_metric('frag'),
            frag_car=self.agent.car.stat_log.get_metric('frag'),
        )
        return d


class RPGStateMessage(Message):
    def as_dict(self):
        d = super(RPGStateMessage, self).as_dict()
        lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = self.agent.example.exp_table.by_exp(
            exp=self.agent.stat_log.get_metric('exp'))
        d.update(
            driving=self.agent.example.driving.value,
            shooting=self.agent.example.shooting.value,
            masking=self.agent.example.masking.value,
            leading=self.agent.example.leading.value,
            trading=self.agent.example.trading.value,
            engineering=self.agent.example.engineering.value,
            current_level=lvl,
            current_exp=self.agent.stat_log.get_metric('exp'),
            next_level=nxt_lvl,
            next_level_exp=nxt_lvl_exp,
            perks=[
                dict(
                    perk=perk.as_client_dict(),
                    active=perk in self.agent.example.perks,
                    perk_req=[self.agent.server.reg[p_req].node_hash() for p_req in perk.perks_req],
                ) for perk in self.agent.server.reg['/rpg_settings/perks'].deep_iter()
            ],
        )
        return d


class JournalParkingInfoMessage(Message):
    def as_dict(self):
        d = super(JournalParkingInfoMessage, self).as_dict()

        template_table = tornado.template.Loader(
            "templates/location",
            namespace=self.agent.connection.get_template_namespace()
        ).load("car_info_table.html")

        template_img = tornado.template.Loader(
            "templates/location",
            namespace=self.agent.connection.get_template_namespace()
        ).load("car_info_img_ext.html")

        d.update(cars=[dict(
            car_info=dict(
                car=car.as_client_dict(),
                html_car_table=template_table.generate(car=car),
                html_car_img=template_img.generate(car=car),
                # armorer_css=tornado.template.Loader('.').load(car.armorer_car).generate(car=car, need_css_only=True)
                armorer_css=''
            ),
            location=car.last_location.node_hash(),
            location_name=car.last_location.title,
        ) for car in self.agent.example.car_list])
        return d


class AdminArchiveCompleteMessage(Message):
    pass


class StrategyModeInfoObjectsMessage(Message):
    def __init__(self, objects, **kw):
        super(StrategyModeInfoObjectsMessage, self).__init__(**kw)
        self.objects = objects

    def as_dict(self):
        d = super(StrategyModeInfoObjectsMessage, self).as_dict()
        d.update(
            objects=[obj.position(time=self.time) for obj in self.objects]
        )
        return d


class NPCTransactionMessage(Message):
    _transaction_time_format = "%d.%m.%Y"

    def __init__(self, npc_html_hash, info_string, **kw):
        super(NPCTransactionMessage, self).__init__(**kw)
        self.info_string = info_string
        self.npc_html_hash = npc_html_hash

    def as_dict(self):
        d = super(NPCTransactionMessage, self).as_dict()
        d.update(
            info_string=self.info_string,
            npc_html_hash=self.npc_html_hash,
        )
        return d


# Вызывается тогда, когда не меняется машинка.
class UserExampleSelfShortMessage(Message):
    def as_dict(self):
        d = super(UserExampleSelfShortMessage, self).as_dict()
        agent = self.agent
        user = agent.user
        ex_car = agent.example.car
        d['user_name'] = user.name
        d['avatar_link'] = user.avatar_link
        d['example_agent'] = agent.example.as_client_dict()
        d['example_car'] = None if ex_car is None else ex_car.as_client_dict()

        if agent.example.role_class:
            d['free_point_skills'] = agent.skill_points + agent.example.role_class.start_free_point_skills - \
                                     agent.example.skill_point_summ()
            d['free_point_perks'] = agent.lvl + agent.example.role_class.start_free_point_perks - len(agent.example.perks)


        # Шаблоны машинки
        templates = dict()
        if ex_car:
            template_car_img = tornado.template.Loader(
                "../sublayers_server/templates/location",
                namespace=agent.connection.get_template_namespace()
            ).load("car_info_img_ext.html")

            templates['html_car_img'] = template_car_img.generate(car=ex_car)
            d['templates'] = templates

            # Инвентарь
            d['car_inventory'] = dict(
                max_size=ex_car.inventory_size,
                items=[
                    dict(
                        position=ex.position,
                        item=dict(
                            cls='ItemState',
                            balance_cls=ex.parent.node_hash(),
                            example=ex.as_client_dict(),
                            max_val=ex.stack_size,
                            t0=self.time,
                            val0=ex.amount,
                            dvs=0,
                        )
                    )
                    for ex in ex_car.inventory
                ],
                owner_id=agent.uid
            )

            car_npc_info = dict()
            # Информация для оружейника
            car_npc_info['armorer_slots'] = [
                dict(name=k, value=v and v.as_client_dict())
                for k, v in self.agent.example.car.iter_slots(tags='armorer')
            ]
            car_npc_info['armorer_slots_flags'] = [
                dict(name=attr.name, value=getter and getter())
                for attr, getter in self.agent.example.car.iter_attrs(tags='slot_limit')
            ]
            # Информация для механика
            car_npc_info['mechanic_slots'] = [
                dict(name=k, value=v and v.as_client_dict(), tags=[el for el in attr.tags])
                for k, v, attr in self.agent.example.car.iter_slots2(tags='mechanic')
            ]
            # Информация для тюнера
            car_npc_info['tuner_slots'] = [
                dict(name=k, value=v and v.as_client_dict(), tags=[el for el in attr.tags])
                for k, v, attr in self.agent.example.car.iter_slots2(tags='tuner')
            ]

            d['car_npc_info'] = car_npc_info

        return d


# Вызывается при смене машинки или инициализации
class UserExampleSelfMessage(UserExampleSelfShortMessage):
    def as_dict(self):
        d = super(UserExampleSelfMessage, self).as_dict()
        ex_car = self.agent.example.car

        if ex_car:
            template_armorer_car = tornado.template.Loader(
                "../sublayers_common/",
                namespace=self.agent.connection.get_template_namespace()
            ).load(ex_car.armorer_car)

            path_static = os.path.join(options.static_path, '..')
            # todo: чтение файлов с диска - не очень хорошо! Возможно закешировать!
            html_tuner_car = ''
            with open(os.path.join(path_static, ex_car.tuner_car)) as f:
                html_tuner_car = f.read()

            armorer_sectors_svg = ''
            with open(os.path.join(path_static, ex_car.armorer_sectors_svg)) as f:
                armorer_sectors_svg = f.read()

            # механик-системы
            mechanic_engine = ''
            with open(os.path.join(path_static, ex_car.mechanic_engine)) as f:
                mechanic_engine = f.read()
            mechanic_transmission = ''
            with open(os.path.join(path_static, ex_car.mechanic_transmission)) as f:
                mechanic_transmission = f.read()
            mechanic_brakes = ''
            with open(os.path.join(path_static, ex_car.mechanic_brakes)) as f:
                mechanic_brakes = f.read()
            mechanic_cooling = ''
            with open(os.path.join(path_static, ex_car.mechanic_cooling)) as f:
                mechanic_cooling = f.read()
            mechanic_suspension = ''
            with open(os.path.join(path_static, ex_car.mechanic_suspension)) as f:
                mechanic_suspension = f.read()

            d['templates']['html_armorer_car'] = template_armorer_car.generate(car=ex_car, need_css_only=False)
            d['templates']['html_tuner_car'] = html_tuner_car
            d['templates']['armorer_sectors_svg'] = armorer_sectors_svg
            d['templates']['mechanic_engine'] = mechanic_engine
            d['templates']['mechanic_transmission'] = mechanic_transmission
            d['templates']['mechanic_brakes'] = mechanic_brakes
            d['templates']['mechanic_cooling'] = mechanic_cooling
            d['templates']['mechanic_suspension'] = mechanic_suspension

        return d


# Общее сообщение-родитель для всех видов информационных сообщений для города (для заполнения города)
class NPCInfoMessage(Message):
    def __init__(self, npc_node_hash, **kw):
        super(NPCInfoMessage, self).__init__(**kw)
        self.npc_node_hash = npc_node_hash


# Сообщение-ответ для клиента - информация об нпц-ангаре
class HangarInfoMessage(NPCInfoMessage):
    def as_dict(self):
        d = super(HangarInfoMessage, self).as_dict()
        npc = self.agent.server.reg[self.npc_node_hash]

        if npc and npc.type == 'hangar':
            template_table = tornado.template.Loader(
                "templates/location",
                namespace=self.agent.connection.get_template_namespace()
            ).load("car_info_table.html")

            template_img = tornado.template.Loader(
                "templates/location",
                namespace=self.agent.connection.get_template_namespace()
            ).load("car_info_img_ext.html")

            prototypes = [self.agent.server.reg[car] for car in npc.car_list]

            d.update(cars=[dict(
                car=car.as_client_dict(),
                html_car_table=template_table.generate(car=car),
                html_car_img=template_img.generate(car=car),
            ) for car in prototypes])
        d['npc_html_hash'] = npc.node_html()
        return d


# Сообщение-ответ для клиента - информация об нпц-стоянке
class ParkingInfoMessage(NPCInfoMessage):
    def as_dict(self):
        d = super(ParkingInfoMessage, self).as_dict()
        npc = self.agent.server.reg[self.npc_node_hash]
        agent = self.agent
        if npc and npc.type == 'parking':
            template_table = tornado.template.Loader(
                "templates/location",
                namespace=agent.connection.get_template_namespace()
            ).load("car_info_table.html")
            template_img = tornado.template.Loader(
                "templates/location",
                namespace=agent.connection.get_template_namespace()
            ).load("car_info_img_ext.html")

            d.update(cars=[dict(
                car=car.as_client_dict(),
                car_parking_price=npc.get_car_price(car),
                html_car_table=template_table.generate(car=car),
                html_car_img=template_img.generate(car=car),
            ) for car in agent.example.get_car_list_by_npc(npc)])
        d['npc_html_hash'] = npc.node_html()
        return d
