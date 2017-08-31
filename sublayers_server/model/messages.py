# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.utils import time_log_format, serialize
from sublayers_server.model.balance import BALANCE

import math
import os.path
from tornado.template import Loader, Template
from tornado.options import options
from ctx_timer import Timer, T


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
        if self.agent is not None and self.agent.connection is not None:
            self.agent.server.post_message(self)

    def send(self):
        # todo: online status optimization
        connection = self.agent.connection
        # log.debug('Send message: %s to %r', self, self.agent._login)
        if connection:
            if connection.ws_connection:
                with Timer(name='message_send_timer', log_start=None, logger=None, log_stop=None) as message_send_timer:
                    package = make_push_package([self])
                    try:
                        data = serialize(package)
                    except Exception as e:
                        log.error('The problem in serialization package %r of message %r: %r', package, self, e)
                        raise e
                    connection.send(data)
                    len_data = len(data)

                cl_name = self.classname
                if self.messages_metrics.get(cl_name, None):
                    average = self.messages_metrics[cl_name]["average"]
                    count = self.messages_metrics[cl_name]["count"]
                    self.messages_metrics[cl_name]["average"] = (average * count + len_data) / (count + 1)
                    self.messages_metrics[cl_name]["count"] += 1
                    self.messages_metrics[cl_name]["duration"] += message_send_timer.duration
                else:
                    self.messages_metrics[cl_name] = {
                        "average": len_data,
                        "count": 1,
                        "duration": message_send_timer.duration
                    }

        else:
            # todo: refactoring
            from sublayers_server.model.agents import AI
            if not isinstance(self.agent, AI):
                log.debug('Connection not found for agent %s', self.agent._login)

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

    messages_metrics = dict()


class InitTime(Message):
    pass


class RefreshMessage(Message):
    pass


class InitAgent(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def as_dict(self):
        d = super(InitAgent, self).as_dict()
        d.update(
            agent=self.agent.as_dict(time=self.time),
            notes=[note.as_client_dict() for note in self.agent.example.profile.notes]
        )
        return d


class InitCar(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def as_dict(self):
        d = super(InitCar, self).as_dict()
        d.update(
            car=self.agent.car.as_dict(time=self.time),
            auto_shooting_state=self.agent.car.turn_on_auto_fire,
        )
        return d


class Die(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def as_dict(self):
        d = super(Die, self).as_dict()
        towns = self.agent.example.profile.insurance.get_respawn_towns(agent=self.agent.example, time=self.time)
        d.update(
            towns=[dict(title=town.title) for town in towns],
            insurance=self.agent.example.profile.insurance.as_client_dict(),
        )
        return d


class QuickGameDie(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, obj, points, **kw):
        """
        @param sublayers_server.model.agents.Agent author: Sender of message
        @param unicode text: message text
        """
        super(QuickGameDie, self).__init__(**kw)
        self.obj = obj
        self.points = points

    def as_dict(self):
        with Timer() as tm0:
            d = super(QuickGameDie, self).as_dict()
            with Timer() as tm1:
                quick_users = list(self.agent.server.app.db.quick_game_records.find().sort("points", -1).limit(1000))
            points = self.points
            with Timer() as tm2:
                record_index = self.agent.server.app.db.quick_game_records.find({"points": {"$gte": points}, "time": {"$lte": self.time}}).count()

            d.update(
                login=self.agent.print_login(),
                points=points,
                record_index=record_index + 1,
                object=self.obj.as_dict(time=self.time),
                quick_users=[dict(points=rec['points'], name=rec['name']) for rec in quick_users],
                current_car_index=self.agent.user.car_index,
            )
        log.debug(
            '#PROF:: QuickGameDie: '
            'fetch_top={tm1.duration:.3f}s, '
            'count_rating={tm2.duration:.3f}s, '
            'TOTAL={tm0.duration:.3f}s'.format(tm0=tm0, tm1=tm1, tm2=tm2))
        return d


class DieVisualisationMessage(Message):
    def __init__(self, obj, direction, **kw):
        super(DieVisualisationMessage, self).__init__(**kw)
        self.obj = obj
        self.direction = direction

    def as_dict(self):
        d = super(DieVisualisationMessage, self).as_dict()
        d.update(
            object_id=self.obj.uid,
            direction=self.direction,
        )
        return d


class QuickGameChangePoints(Message):
    def as_dict(self):
        d = super(QuickGameChangePoints, self).as_dict()
        agent = self.agent
        d.update(
            quick_game_bonus_points=agent.bonus_points,
            quick_game_bot_kills=agent.quick_game_bot_kills,
            quick_game_kills=agent.quick_game_kills,
            time_quick_game_start=agent.time_quick_game_start,
            quick_game_koeff_kills=agent.quick_game_koeff_kills,
            quick_game_koeff_bot_kills=agent.quick_game_koeff_bot_kills,
            quick_game_koeff_time=agent.quick_game_koeff_time,
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


class SystemChatMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] @{self.author} SAY "self.text">'

    def __init__(self, text=None, **kw):
        """
        @param sublayers_server.model.agents.Agent author: Sender of message
        @param unicode text: message text
        """
        super(SystemChatMessage, self).__init__(**kw)
        self.text = text

    def as_dict(self):
        d = super(SystemChatMessage, self).as_dict()
        d.update(text=self.text)
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
        p_armor = obj.params.get('p_armor', None)
        dict_update = dict(
            uid=obj.uid,
            state=None if getattr(obj, "state", None) is None else obj.state.export(),
            hp_state=None if getattr(obj, "hp_state", None) is None else obj.hp_state.export(),
            active_shield_effect=False if p_armor is None else p_armor.value >= 100, # todo: пока нет списка всех визуальных эффектов для клиента, определение наличия неуязвимости будет выглядить так
        )
        if getattr(obj, "owner", None) is not None and self.agent == obj.owner:
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
            obj_cls=self.obj.__class__.__name__,
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
    def __init__(self, pos_subj, targets, fake_position, weapon_animation, weapon_audio, self_shot=False, **kw):
        """
        @param sublayers_server.model.base.VisibleObject obj: Sender of message
        """
        super(FireDischargeEffect, self).__init__(**kw)
        self.pos_subj = pos_subj
        self.targets = targets
        self.fake_position = fake_position
        self.self_shot = self_shot
        self.weapon_animation = weapon_animation
        self.weapon_audio = weapon_audio

    def as_dict(self):
        d = super(FireDischargeEffect, self).as_dict()
        d.update(
            pos_subj=self.pos_subj,
            targets=self.targets,
            fake_position=self.fake_position,
            self_shot=self.self_shot,
            weapon_animation=self.weapon_animation,
            weapon_audio=self.weapon_audio,
        )
        return d


class FireAutoEffect(Message):
    def __init__(self, subj, obj, weapon=None, sector=None, action=True, **kw):
        super(FireAutoEffect, self).__init__(**kw)
        self.subj = subj
        self.obj = obj
        self.sector = sector
        self.action = action
        self.weapon = weapon

    def as_dict(self):
        d = super(FireAutoEffect, self).as_dict()
        weapon_animation = []
        animation_tracer_rate = None
        side = None
        if self.sector:
            for w in self.sector.weapon_list:
                weapon_animation += w.example.weapon_animation
            animation_tracer_rate = self.sector.weapon_list[0].example.animation_tracer_rate
            side = self.sector.side

        d.update(
            subj=self.subj.uid,
            obj=self.obj.uid,
            side=side,
            action=self.action,
            weapon_animation=[item for item in set(weapon_animation)],
            animation_tracer_rate=animation_tracer_rate,
            weapon_id=self.weapon.id if self.weapon else None,
            weapon_audio=[item for item in self.weapon.example.weapon_audio] if self.weapon else [],
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


class PartyInfoMessage(Message):
    def __init__(self, party, **kw):
        super(PartyInfoMessage, self).__init__(**kw)
        self.party = party

    def as_dict(self):
        d = super(PartyInfoMessage, self).as_dict()
        d.update(
            party=self.party.as_dict(with_members=True),
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


class PreEnterToLocation(Message):
    def __init__(self, location, agent, **kw):
        super(PreEnterToLocation, self).__init__(agent=agent, **kw)
        self.location = location
        self.agent = agent

    def as_dict(self):
        d = super(PreEnterToLocation, self).as_dict()
        location = self.location

        from sublayers_server.model.map_location import Town, GasStation
        if isinstance(location, Town) or isinstance(location, GasStation):
            d.update(static_image_list=location.example.static_image_list)
        else:
            log.warn('Unknown type location: %s', location)
        return d


class EnterToLocation(Message):
    # info: данный мессадж кеширует свой результат
    locations_cache = {}  # key=URI value=html локации

    def __init__(self, location, agent, **kw):
        super(EnterToLocation, self).__init__(agent=agent, **kw)
        self.location = location
        self.agent = agent

    def get_location_html(self):
        location = self.location
        if self.agent.resolution_scale not in ['big', 'small']:
            self.agent.resolution_scale = 'big'
        lang = self.agent.connection.user_lang
        cache_index = '{}_{}_{}'.format(location.example.uri, self.agent.resolution_scale, lang)
        location_html = self.locations_cache.get(cache_index, None)
        if location_html is None:
            svg_link_common = os.path.join(options.static_path, 'content/locations/map_locations/common')
            svg_code_common = ''
            svg_code_btn = ''
            svg_code_common_file = 'location_back_big.svg' if self.agent.resolution_scale == 'big' else 'location_back_small.svg'.format(lang)
            svg_code_btn_file = 'location_btn_big_{}.svg'.format(lang) if self.agent.resolution_scale == 'big' else 'location_btn_small_{}.svg'.format(lang)
            with open(os.path.join(svg_link_common, svg_code_common_file)) as f:
                svg_code_common = f.read()
                svg_code_common = patch_svg_links(src=svg_code_common, pth='static/content/locations/map_locations/common/')
            with open(os.path.join(svg_link_common, svg_code_btn_file)) as f:
                svg_code_btn = f.read()
                svg_code_btn = patch_svg_links(src=svg_code_btn, pth='static/content/locations/map_locations/common/')

            svg_link = os.path.join(os.path.join(options.static_path, '..'), location.example.svg_link)
            svg_code = ''
            with open(os.path.join(svg_link, 'location_{}.svg'.format(lang))) as f:
                svg_code = f.read()
                svg_code = patch_svg_links(src=svg_code, pth=(location.example.svg_link + '/'))
            location_html = ''
            from sublayers_server.model.map_location import Town, GasStation
            if isinstance(location, Town) or isinstance(location, GasStation):
                location_html = Loader(
                    root_directory="templates/location",
                    namespace=self.agent.connection.get_template_namespace(),
                ).load("location.html").generate(location=location, svg_code=svg_code, svg_code_common=svg_code_common,
                                                 svg_code_btn=svg_code_btn, is_big=(self.agent.resolution_scale == 'big'), car=None)
            else:
                log.warn('Unknown type location: %s', location)
            self.locations_cache[cache_index] = location_html
            log.debug('{}  added to cache '.format(cache_index))
        return location_html

    def as_dict(self):
        d = super(EnterToLocation, self).as_dict()
        agent = self.agent
        location = self.location
        location_html = self.get_location_html()
        d.update(
            location=self.location.as_dict(time=self.time, from_message_see=False),
            relations=[dict(npc_node_hash=npc.node_hash(), relation=agent.example.profile.get_relationship(npc=npc))
                      for npc in location.example.get_npc_list()],
            location_html=location_html,
        )
        return d


class ExitFromLocation(Message):
    pass


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
    def __init__(self, room_name, chat_type=None, members=[], **kw):
        super(ChatRoomIncludeMessage, self).__init__(**kw)
        self.room_name = room_name
        self.chat_type = chat_type
        self.members = members  # только для приватных чатов

    def as_dict(self):
        d = super(ChatRoomIncludeMessage, self).as_dict()
        d.update(
            room_name=self.room_name,
            chat_type=self.chat_type,
            members=self.members
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


class GetPrivateChatMembersMessage(Message):
    def __init__(self, chat, **kw):
        super(GetPrivateChatMembersMessage, self).__init__(**kw)
        self.chat = chat

    def as_dict(self):
        d = super(GetPrivateChatMembersMessage, self).as_dict()
        d.update(
            room_name=self.chat.name,
            members=[member.user.name for member in self.chat.members],
        )
        return d


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


class NPCReplicaMessage(Message):
    def __init__(self, replica, npc, replica_type='Error', **kw):
        super(NPCReplicaMessage, self).__init__(**kw)
        self.replica = replica
        self.npc = npc
        self.replica_type = replica_type

    def as_dict(self):
        d = super(NPCReplicaMessage, self).as_dict()
        d.update(
            replica=self.replica,
            replica_type=self.replica_type,
            npc_node_hash=self.npc.node_hash() if self.npc is not None and hasattr(self.npc, 'node_hash') else None,
        )
        if isinstance(self.npc, bool):
            log.warning('NPC in %r is bool: %r', self, self.npc)
        return d


class JournalParkingInfoMessage(Message):
    def as_dict(self):
        d = super(JournalParkingInfoMessage, self).as_dict()

        template_table = Loader(
            "templates/location",
            namespace=self.agent.connection.get_template_namespace()
        ).load("car_info_table.html")

        template_img = Loader(
            "templates/location",
            namespace=self.agent.connection.get_template_namespace()
        ).load("car_info_img_ext.html")

        d.update(cars=[dict(
            car_info=dict(
                car=car.as_client_dict(),
                html_car_table=template_table.generate(car=car, agent=None),
                html_car_img=template_img.generate(car=car),
                # armorer_css=Loader('.').load(car.armorer_car).generate(car=car, need_css_only=True)
                armorer_css=''
            ),
            location=car.last_location.node_hash(),
            location_name=car.last_location.title,
        ) for car in self.agent.example.profile.car_list])
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


class UserChangeEXP(Message):
    def as_dict(self):
        d = super(UserChangeEXP, self).as_dict()
        agent = self.agent
        agent_example = agent.example.profile
        cur_exp = agent_example.exp
        lvl, (next_lvl, next_lvl_exp), rest_exp = agent.example.profile.exp_table.by_exp(exp=cur_exp)
        d.update(
            data=dict(
                cur_lvl=math.floor(lvl / 10),
                cur_exp=cur_exp,
                cur_lvl_exp=agent.example.profile.exp_table.user_exp_by_lvl(lvl=lvl),
                next_lvl_exp=next_lvl_exp,
                all_skill_points=(lvl + agent_example.role_class.start_free_point_skills),
                all_perks_points=math.floor(lvl / 10) + agent_example.role_class.start_free_point_perks,
            )
        )
        return d


class UserChangeQuestInventory(Message):
    def as_dict(self):
        d = super(UserChangeQuestInventory, self).as_dict()
        agent = self.agent
        agent_example = agent.example.profile
        quest_inventory = []
        insurance = agent_example.insurance
        for item in agent_example.quest_inventory.items:
            dd = item.as_client_dict()
            if item is insurance:
                dd.update(title=u'{}: {}'.format(agent.print_login(), item.title))
            quest_inventory.append(dd)
        d.update(
            data=dict(
                quest_inventory=quest_inventory,
                agent_effects=agent_example.get_agent_effects(time=self.time),
            ),
        )
        return d
    

class UserChangePerkSkill(Message):
    all_perks = []

    def as_dict(self):
        d = super(UserChangePerkSkill, self).as_dict()
        agent_example = self.agent.example.profile

        if not UserChangePerkSkill.all_perks:
            for perk in self.agent.server.reg.get('/registry/rpg_settings/perks').deep_iter():
                UserChangePerkSkill.all_perks.append(dict(
                    perk=perk,
                    perk_dict=perk.as_client_dict(),
                    perk_req=[p_req.node_hash() for p_req in perk.perks_req],
                ))
        perk_list = UserChangePerkSkill.all_perks

        agent_perks = agent_example.perks
        perks = [dict(
            perk=perk_rec['perk_dict'],
            active=perk_rec['perk'] in agent_perks,
            perk_req=perk_rec['perk_req'],
        ) for perk_rec in perk_list]

        d.update(
            rpg_info=dict(
                driving=agent_example.driving.as_client_dict(),
                shooting=agent_example.shooting.as_client_dict(),
                masking=agent_example.masking.as_client_dict(),
                leading=agent_example.leading.as_client_dict(),
                trading=agent_example.trading.as_client_dict(),
                engineering=agent_example.engineering.as_client_dict(),
                buy_driving=agent_example.buy_driving.as_client_dict(),
                buy_shooting=agent_example.buy_shooting.as_client_dict(),
                buy_masking=agent_example.buy_masking.as_client_dict(),
                buy_leading=agent_example.buy_leading.as_client_dict(),
                buy_trading=agent_example.buy_trading.as_client_dict(),
                buy_engineering=agent_example.buy_engineering.as_client_dict(),
                perks=perks,
            ),
        )
        return d


class UserGetAboutSelf(Message):
    def as_dict(self):
        d = super(UserGetAboutSelf, self).as_dict()
        d.update(about_self=self.agent.example.profile.about_self if self.agent and self.agent.example.profile else '')
        return d


class UserExampleCarInfo(Message):
    def as_dict(self):
        d = super(UserExampleCarInfo, self).as_dict()
        ex_car = self.agent.example.profile.car
        d['example_car'] = None if ex_car is None else ex_car.as_client_dict()
        return d


class UserExampleCarView(Message):
    def as_dict(self):
        d = super(UserExampleCarView, self).as_dict()
        agent = self.agent
        ex_car = agent.example.profile.car
        templates = dict()
        if ex_car:
            # Шаблоны машинки
            template_car_img = Loader(
                "../sublayers_server/templates/location",
                namespace=agent.connection.get_template_namespace()
            ).load("car_info_img_ext.html")
            template_table = Loader(
                "templates/location",
                namespace=agent.connection.get_template_namespace()
            ).load("car_info_table.html")
            templates['html_car_img'] = template_car_img.generate(car=ex_car)
            templates['html_car_table'] = template_table.generate(car=ex_car, agent=agent)
        else:
            templates['html_car_img'] = None
            templates['html_car_table'] = None
        d['templates'] = templates
        return d


class UserExampleCarSlots(Message):
    def as_dict(self):
        d = super(UserExampleCarSlots, self).as_dict()
        agent = self.agent
        ex_car = agent.example.profile.car
        if ex_car:
            # Информация по слотам
            car_npc_info = dict()
            car_npc_info['armorer_slots'] = [
                dict(name=k, value=v and v.as_client_dict())
                for k, v in ex_car.iter_slots(tags='armorer')
            ]
            car_npc_info['armorer_slots_flags'] = [
                dict(name=name, value=getter and getter())
                for name, attr, getter in ex_car.iter_attrs(tags='slot_limit')
            ]
            # Информация для механика
            car_npc_info['mechanic_slots'] = [
                dict(name=k, value=v and v.as_client_dict(), tags=[el for el in attr.tags])
                for k, v, attr in ex_car.iter_slots2(tags='mechanic')
            ]
            # Информация для тюнера
            car_npc_info['tuner_slots'] = [
                dict(name=k, value=v and v.as_client_dict(), tags=[el for el in attr.tags])
                for k, v, attr in ex_car.iter_slots2(tags='tuner')
            ]
            d['car_npc_info'] = car_npc_info
        return d


class UserExampleCarNPCTemplates(Message):
    def as_dict(self):
        d = super(UserExampleCarNPCTemplates, self).as_dict()
        d['templates'] = dict()
        ex_car = self.agent.example.profile.car
        if ex_car:
            namespace=self.agent.connection.get_template_namespace()
            template_armorer_car = Loader(
                "../sublayers_common/",
                namespace=namespace
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
            # todo: измерять скорость обработки, возможно закешировать по локалям
            with open(os.path.join(path_static, ex_car.mechanic_engine)) as f:
                mechanic_engine = f.read()
                mechanic_engine = Template(mechanic_engine).generate(**namespace)
            mechanic_transmission = ''
            with open(os.path.join(path_static, ex_car.mechanic_transmission)) as f:
                mechanic_transmission = f.read()
                mechanic_transmission = Template(mechanic_transmission).generate(**namespace)
            mechanic_brakes = ''
            with open(os.path.join(path_static, ex_car.mechanic_brakes)) as f:
                mechanic_brakes = f.read()
                mechanic_brakes = Template(mechanic_brakes).generate(**namespace)
            mechanic_cooling = ''
            with open(os.path.join(path_static, ex_car.mechanic_cooling)) as f:
                mechanic_cooling = f.read()
                mechanic_cooling = Template(mechanic_cooling).generate(**namespace)
            mechanic_suspension = ''
            with open(os.path.join(path_static, ex_car.mechanic_suspension)) as f:
                mechanic_suspension = f.read()
                mechanic_suspension = Template(mechanic_suspension).generate(**namespace)

            d['templates']['html_armorer_car'] = template_armorer_car.generate(car=ex_car, need_css_only=False)
            d['templates']['html_tuner_car'] = html_tuner_car
            d['templates']['armorer_sectors_svg'] = armorer_sectors_svg
            d['templates']['mechanic_engine'] = mechanic_engine
            d['templates']['mechanic_transmission'] = mechanic_transmission
            d['templates']['mechanic_brakes'] = mechanic_brakes
            d['templates']['mechanic_cooling'] = mechanic_cooling
            d['templates']['mechanic_suspension'] = mechanic_suspension
        else:
            d['templates']['html_armorer_car'] = None
            d['templates']['html_tuner_car'] = None
            d['templates']['armorer_sectors_svg'] = None
            d['templates']['mechanic_engine'] = None
            d['templates']['mechanic_transmission'] = None
            d['templates']['mechanic_brakes'] = None
            d['templates']['mechanic_cooling'] = None
            d['templates']['mechanic_suspension'] = None
        return d


class UserExampleChangeInsurance(Message):
    def as_dict(self):
        d = super(UserExampleChangeInsurance, self).as_dict()
        d['insurance'] = self.agent.example.profile.insurance.as_client_dict()
        return d


class UserActualTradingMessage(Message):
    def as_dict(self):
        d = super(UserActualTradingMessage, self).as_dict()
        d['trading'] = self.agent.example.profile.get_current_agent_trading()
        return d


# Вызывается тогда, когда нужна только RPG сотставляющая
class UserExampleSelfRPGMessage(Message):
    all_perks = []

    def as_dict(self):
        d = super(UserExampleSelfRPGMessage, self).as_dict()
        agent = self.agent
        cur_exp = agent.example.profile.exp
        lvl, (next_lvl, next_lvl_exp), rest_exp = agent.example.profile.exp_table.by_exp(exp=cur_exp)

        # Формирование квестового инвентаря с изменённым именем страховки
        insurance = agent.example.profile.insurance
        quest_inventory = []
        for item in agent.example.profile.quest_inventory.items:
            dd = item.as_client_dict()
            if item is insurance:
                dd.update(title=u'{}: {}'.format(agent.print_login(), item.title))
            quest_inventory.append(dd)

        rpg_info = dict()
        # Кеширование списка перков
        if not UserExampleSelfRPGMessage.all_perks:
            for perk in self.agent.server.reg.get('/registry/rpg_settings/perks').deep_iter():
                UserExampleSelfRPGMessage.all_perks.append(dict(
                    perk=perk,
                    perk_dict=perk.as_client_dict(),
                    perk_req=[p_req.node_hash() for p_req in perk.perks_req],
                ))
        deep_perks = UserExampleSelfRPGMessage.all_perks

        agent_perks = agent.example.profile.perks
        perks = [dict(
            perk=perk['perk_dict'],
            active=perk['perk'] in agent_perks,
            perk_req=perk['perk_req'],
        ) for perk in deep_perks]

        rpg_info.update(
            karma=agent.example.profile.karma,
            cur_lvl=math.floor(lvl / 10),
            cur_exp=cur_exp,
            cur_lvl_exp=agent.example.profile.exp_table.user_exp_by_lvl(lvl=lvl),
            next_lvl_exp=next_lvl_exp,

            all_skill_points=(lvl + agent.example.profile.role_class.start_free_point_skills),  # без учета купленныых!!!
            driving        =agent.example.profile.driving        .as_client_dict(),
            shooting       =agent.example.profile.shooting       .as_client_dict(),
            masking        =agent.example.profile.masking        .as_client_dict(),
            leading        =agent.example.profile.leading        .as_client_dict(),
            trading        =agent.example.profile.trading        .as_client_dict(),
            engineering    =agent.example.profile.engineering    .as_client_dict(),
            buy_driving    =agent.example.profile.buy_driving    .as_client_dict(),
            buy_shooting   =agent.example.profile.buy_shooting   .as_client_dict(),
            buy_masking    =agent.example.profile.buy_masking    .as_client_dict(),
            buy_leading    =agent.example.profile.buy_leading    .as_client_dict(),
            buy_trading    =agent.example.profile.buy_trading    .as_client_dict(),
            buy_engineering=agent.example.profile.buy_engineering.as_client_dict(),

            all_perks_points=math.floor(lvl / 10) + agent.example.profile.role_class.start_free_point_perks,
            perks=perks,
            quest_inventory=quest_inventory,
            agent_effects=agent.example.profile.get_agent_effects(time=self.time),
        )
        d['rpg_info'] = rpg_info
        return d


# Вызывается тогда, когда не меняется машинка.
class UserExampleSelfShortMessage(UserExampleSelfRPGMessage):
    def as_dict(self):
        d = super(UserExampleSelfShortMessage, self).as_dict()
        agent = self.agent
        user = agent.user
        ex_car = agent.example.profile.car

        d['user_name'] = user.name
        d['avatar_link'] = user.avatar_link
        d['example_agent'] = agent.example.profile.as_client_dict()
        d['example_car'] = None if ex_car is None else ex_car.as_client_dict()

        if ex_car:
            # Шаблоны машинки
            templates = dict()
            template_car_img = Loader(
                "../sublayers_server/templates/location",
                namespace=agent.connection.get_template_namespace()
            ).load("car_info_img_ext.html")
            template_table = Loader(
                "templates/location",
                namespace=agent.connection.get_template_namespace()
            ).load("car_info_table.html")

            templates['html_car_img'] = template_car_img.generate(car=ex_car)
            templates['html_car_table'] = template_table.generate(car=ex_car, agent=agent)
            d['templates'] = templates

            car_npc_info = dict()
            # Информация для оружейника
            car_npc_info['armorer_slots'] = [
                dict(name=k, value=v and v.as_client_dict())
                for k, v in self.agent.example.profile.car.iter_slots(tags='armorer')
            ]
            car_npc_info['armorer_slots_flags'] = [
                dict(name=name, value=getter and getter())
                for name, attr, getter in self.agent.example.profile.car.iter_attrs(tags='slot_limit')
            ]
            # Информация для механика
            car_npc_info['mechanic_slots'] = [
                dict(name=k, value=v and v.as_client_dict(), tags=[el for el in attr.tags])
                for k, v, attr in self.agent.example.profile.car.iter_slots2(tags='mechanic')
            ]
            # Информация для тюнера
            car_npc_info['tuner_slots'] = [
                dict(name=k, value=v and v.as_client_dict(), tags=[el for el in attr.tags])
                for k, v, attr in self.agent.example.profile.car.iter_slots2(tags='tuner')
            ]

            d['car_npc_info'] = car_npc_info
        return d


# Вызывается при смене машинки или инициализации
class UserExampleSelfMessage(UserExampleSelfShortMessage):
    def as_dict(self):
        d = super(UserExampleSelfMessage, self).as_dict()
        ex_car = self.agent.example.profile.car
        if ex_car:
            namespace=self.agent.connection.get_template_namespace()
            template_armorer_car = Loader(
                "../sublayers_common/",
                namespace=namespace
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
            # todo: измерять скорость обработки, возможно закешировать по локалям
            mechanic_engine = ''
            with open(os.path.join(path_static, ex_car.mechanic_engine)) as f:
                mechanic_engine = f.read()
                mechanic_engine = Template(mechanic_engine).generate(**namespace)
            mechanic_transmission = ''
            with open(os.path.join(path_static, ex_car.mechanic_transmission)) as f:
                mechanic_transmission = f.read()
                mechanic_transmission = Template(mechanic_transmission).generate(**namespace)
            mechanic_brakes = ''
            with open(os.path.join(path_static, ex_car.mechanic_brakes)) as f:
                mechanic_brakes = f.read()
                mechanic_brakes = Template(mechanic_brakes).generate(**namespace)
            mechanic_cooling = ''
            with open(os.path.join(path_static, ex_car.mechanic_cooling)) as f:
                mechanic_cooling = f.read()
                mechanic_cooling = Template(mechanic_cooling).generate(**namespace)
            mechanic_suspension = ''
            with open(os.path.join(path_static, ex_car.mechanic_suspension)) as f:
                mechanic_suspension = f.read()
                mechanic_suspension = Template(mechanic_suspension).generate(**namespace)

            d['templates']['html_armorer_car'] = template_armorer_car.generate(car=ex_car, need_css_only=False)
            d['templates']['html_tuner_car'] = html_tuner_car
            d['templates']['armorer_sectors_svg'] = armorer_sectors_svg
            d['templates']['mechanic_engine'] = mechanic_engine
            d['templates']['mechanic_transmission'] = mechanic_transmission
            d['templates']['mechanic_brakes'] = mechanic_brakes
            d['templates']['mechanic_cooling'] = mechanic_cooling
            d['templates']['mechanic_suspension'] = mechanic_suspension
        return d


# todo: Перенести описание класса в модуль квестов
class QuestsInitMessage(Message):
    u"""Отправка всех квестов агента на клиент"""
    def as_dict(self):
        d = super(QuestsInitMessage, self).as_dict()
        journal = [quest.as_client_dict() for quest in self.agent.example.profile.journal_quests]
        unstarted = [quest.as_unstarted_quest_dict() for quest in self.agent.example.profile.quests_unstarted]
        journal.extend(unstarted)
        d.update(
            quests=journal,
            notes=[note.as_client_dict() for note in self.agent.example.profile.notes],
        )
        return d


# todo: Перенести описание класса в модуль квестов
class QuestsChangeMessage(Message):
    def __init__(self, quest, **kw):
        super(QuestsChangeMessage, self).__init__(**kw)
        self.quest = quest

    def as_dict(self):
        d = super(QuestsChangeMessage, self).as_dict()
        d.update(quest=self.quest.as_client_dict())
        return d


# Общее сообщение-родитель для всех видов информационных сообщений для города (для заполнения города)
class NPCInfoMessage(Message):
    def __init__(self, npc_node_hash, **kw):
        super(NPCInfoMessage, self).__init__(**kw)
        self.npc_node_hash = npc_node_hash
        self.npc = self.agent.server.reg.get(self.npc_node_hash)

    def as_dict(self):
        d = super(NPCInfoMessage, self).as_dict()
        if self.npc:
            d.update(npc_html_hash=self.npc.node_html())
        return d


# Сообщение-ответ для клиента - информация об нпц-ангаре
class HangarInfoMessage(NPCInfoMessage):
    # info: данный мессадж кеширует свой результат
    npc_cars = dict()  # key: npc.uri   val = [dict(car, html_car_table, html_car_img)]
    template_table = None
    template_img = None

    def get_car_list(self, npc):
        npc_key = '{}_{}'.format(npc.uri, self.agent.connection and self.agent.connection.user_lang or 'en')
        car_list = HangarInfoMessage.npc_cars.get(npc_key, None)
        if car_list is None:
            namespace = self.agent.connection.get_template_namespace()
            if HangarInfoMessage.template_table:
                template_table = HangarInfoMessage.template_table
            else:
                template_table = Loader("templates/location").load("car_info_table.html")
                HangarInfoMessage.template_table = template_table

            if HangarInfoMessage.template_img:
                template_img = HangarInfoMessage.template_img
            else:
                template_img = Loader("templates/location").load("car_info_img_ext.html")
            HangarInfoMessage.template_img = template_img

            car_list = [dict(
                car=car.as_client_dict(),
                html_car_table=template_table.generate(car=car, agent=None, **namespace),
                html_car_img=template_img.generate(car=car, **namespace),
            ) for car in npc.car_list or []]

            HangarInfoMessage.npc_cars[npc_key] = car_list
        return car_list

    def as_dict(self):
        d = super(HangarInfoMessage, self).as_dict()
        npc = self.npc
        if npc and npc.type == 'hangar':
            d.update(
                npc_margin=npc.margin,
                npc_trading=npc.trading,
                cars=self.get_car_list(npc),
            )
        return d


# Сообщение-ответ для клиента - информация об нпц-стоянке
class ParkingInfoMessage(NPCInfoMessage):
    def as_dict(self):
        d = super(ParkingInfoMessage, self).as_dict()
        npc = self.npc
        agent = self.agent
        if npc and npc.type == 'parking':
            template_table = Loader(
                "templates/location",
                namespace=agent.connection.get_template_namespace()
            ).load("car_info_table.html")
            template_img = Loader(
                "templates/location",
                namespace=agent.connection.get_template_namespace()
            ).load("car_info_img_ext.html")

            d.update(cars=[dict(
                car=car.as_client_dict(),
                car_parking_price=npc.get_car_price(car),
                html_car_table=template_table.generate(car=car, agent=None),
                html_car_img=template_img.generate(car=car),
            ) for car in agent.example.profile.get_car_list_by_npc(npc)])
        return d


# Сообщение-ответ для клиента - информация об нпц-торговце
class TraderInfoMessage(NPCInfoMessage):
    def as_dict(self):
        d = super(TraderInfoMessage, self).as_dict()
        npc = self.npc
        if npc is None:
            log.warning('NPC not found: %s', self.npc_node_hash)
            return d
        # with T(name='get_trader_assortment'):
        d['trader_assortment'] = npc.get_trader_assortment(agent=self.agent)
        return d


class TraderAgentAssortmentMessage(NPCInfoMessage):
    def as_dict(self):
        d = super(TraderAgentAssortmentMessage, self).as_dict()
        npc = self.npc
        if npc is None:
            log.warning('NPC not found: %s', self.npc_node_hash)
            return d
        if self.agent.example.profile.car is None:
            return d
        # with T(name='get_agent_assortment'):
        d['agent_assortment'] = npc.get_agent_assortment(agent=self.agent, car_items=self.agent.example.profile.car.inventory.items)
        return d


class TraderClearMessage(NPCInfoMessage):
    pass


# Сообщение-ответ для клиента - информация об нпц-тренере
class TrainerInfoMessage(NPCInfoMessage):
    def as_dict(self):
        d = super(TrainerInfoMessage, self).as_dict()
        if self.npc is None:
            log.warning('NPC not found: %s', self.npc_node_hash)
            return d
        d.update(drop_price=self.npc.drop_price)
        return d


# Сообщение-ответ для клиента - информация об нпц-проститутке
class GirlInfoMessage(NPCInfoMessage):
    def __init__(self, items, **kw):
        super(GirlInfoMessage, self).__init__(**kw)
        self.items = items

    def as_dict(self):
        d = super(GirlInfoMessage, self).as_dict()
        d.update(items=[item.as_client_dict() for item in self.items])
        return d


# Сообщение о параметров другого игрока (окно города)
class InteractionInfoMessage(Message):
    def __init__(self, player_nick, **kw):
        super(InteractionInfoMessage, self).__init__(**kw)
        self.player_nick = player_nick

    def as_dict(self):
        d = super(InteractionInfoMessage, self).as_dict()
        player = self.agent.server.agents_by_name.get(str(self.player_nick), None)
        if player:
            player_profile = player.example.profile
            d.update(
                avatar=player.user.avatar_link,
                about_self=player_profile.about_self,
                lvl=player_profile.get_real_lvl(),
                role_class=player_profile.role_class.description,
                karma=player_profile.karma_name(),
                driving=player_profile.driving.calc_value(),
                shooting=player_profile.shooting.calc_value(),
                masking=player_profile.masking.calc_value(),
                leading=player_profile.leading.calc_value(),
                trading=player_profile.trading.calc_value(),
                engineering=player_profile.engineering.calc_value(),
            )

            # Еслли есть машинка то отправить ее шаблоны и имя
            if player_profile.car:
                template_table = Loader(
                    "templates/location",
                    namespace=self.agent.connection.get_template_namespace()
                ).load("car_info_table.html")
                template_img = Loader(
                    "templates/location",
                    namespace=self.agent.connection.get_template_namespace()
                ).load("car_info_img_ext.html")
                d.update(
                    car_name=player_profile.car.title,
                    html_car_table=template_table.generate(car=player_profile.car, agent=player),
                    html_car_img=template_img.generate(car=player_profile.car)
                )
        return d


class PartyUserInfoMessage(Message):
    def __init__(self, player_nick, **kw):
        super(PartyUserInfoMessage, self).__init__(**kw)
        self.player_nick = player_nick

    def as_dict(self):
        d = super(PartyUserInfoMessage, self).as_dict()
        player = self.agent.server.agents_by_name.get(str(self.player_nick), None)
        if player:
            player_profile = player.example.profile
            d.update(
                name=self.player_nick,
                avatar=player.avatar_link,
                lvl=player_profile.get_real_lvl(),
                role_class=player_profile.role_class.description,
                karma=player_profile.karma_name(),
                driving=player_profile.driving.calc_value(),
                shooting=player_profile.shooting.calc_value(),
                masking=player_profile.masking.calc_value(),
                leading=player_profile.leading.calc_value(),
                trading=player_profile.trading.calc_value(),
                engineering=player_profile.engineering.calc_value(),
            )

            # Еслли есть машинка то отправить ее шаблоны и имя
            if player_profile.car:
                template_img = Loader(
                    "templates/location",
                    namespace=self.agent.connection.get_template_namespace()
                ).load("car_info_img_ext.html")
                d.update(
                    car_name = player.example.profile.car.title,
                    html_car_img=template_img.generate(car=player.example.profile.car)
                )
        return d


class ChangeAgentBalance(Message):
    def as_dict(self):
        d = super(ChangeAgentBalance, self).as_dict()
        d.update(
            agent_balance=self.agent.balance,
            uid=self.agent.uid
        )
        return d


class ChangeAgentKarma(Message):
    def as_dict(self):
        relations = []
        if self.agent.current_location:
            relations = [
                dict(npc_node_hash=npc.node_hash(), relation=self.agent.example.profile.get_relationship(npc=npc))
                for npc in self.agent.current_location.example.get_npc_list()
            ]
        d = super(ChangeAgentKarma, self).as_dict()
        d.update(
            relations=relations,
            karma=self.agent.example.profile.karma,
        )
        return d


class StartQuickGame(Message):
    pass


class PingInfoMessage(Message):
    def as_dict(self):
        d = super(PingInfoMessage, self).as_dict()
        if self.agent.connection:
            d.update(ping=self.agent.connection._current_ping)
        return d


class StartActivateItem(Message):
    def __init__(self, item, activate_time, **kw):
        super(StartActivateItem, self).__init__(**kw)
        self.item = item
        self.activate_time = activate_time

    def as_dict(self):
        d = super(StartActivateItem, self).as_dict()
        d.update(
            item=self.item.example.as_client_dict(),
            activate_time=self.activate_time,
        )
        return d


class StopActivateItem(Message):
    def __init__(self, item, **kw):
        super(StopActivateItem, self).__init__(**kw)
        self.item = item

    def as_dict(self):
        d = super(StopActivateItem, self).as_dict()
        d.update(item=self.item.example.as_client_dict())
        return d


class SuccessActivateItem(Message):
    def __init__(self, item, **kw):
        super(SuccessActivateItem, self).__init__(**kw)
        self.item = item

    def as_dict(self):
        d = super(SuccessActivateItem, self).as_dict()
        d.update(item=self.item.example.as_client_dict())
        return d


class QuickGameArcadeTextMessage(Message):
    def __init__(self, text, **kw):
        super(QuickGameArcadeTextMessage, self).__init__(**kw)
        self.text = text

    def as_dict(self):
        d = super(QuickGameArcadeTextMessage, self).as_dict()
        d.update(text=self.text)
        return d


class SetMapCenterMessage(Message):
    def __init__(self, center, **kw):
        super(SetMapCenterMessage, self).__init__(**kw)
        self.center = center

    def as_dict(self):
        d = super(SetMapCenterMessage, self).as_dict()
        d.update(center=self.center)
        return d


class TownAttackMessage(Message):
    def __init__(self, town_position, target_id, target_pos, duration, **kw):
        super(TownAttackMessage, self).__init__(**kw)
        self.town_position = town_position
        self.target_id = target_id
        self.target_pos = target_pos
        self.duration = duration

    def as_dict(self):
        d = super(TownAttackMessage, self).as_dict()
        d.update(
            town_pos=self.town_position,
            target_id=self.target_id,
            target_pos=self.target_pos,
            duration=self.duration
        )
        return d