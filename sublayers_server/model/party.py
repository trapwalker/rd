# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event, event_deco
from sublayers_server.model.messages import (
    PartyInfoMessage, PartyInviteMessage, AgentPartyChangeMessage, PartyExcludeMessageForExcluded,
    PartyIncludeMessageForIncluded, PartyErrorMessage, PartyKickMessageForKicked, PartyInviteDeleteMessage,
    PartyUserInfoMessage)
from sublayers_server.model.chat_room import PartyChatRoom
from sublayers_server.model.quest_events import OnPartyExp


def inc_name_number(name):
    clear_name = name.rstrip('0123456789')
    num = int(name[len(clear_name):] or u'0') + 1
    return u'{}{}'.format(clear_name, num)


class PartyGetPartyInfoEvent(Event):
    def __init__(self, name, agent, **kw):
        assert (name is not None) and (agent is not None)
        super(PartyGetPartyInfoEvent, self).__init__(server=agent.server, **kw)
        self.name = name
        self.agent = agent

    def on_perform(self):
        super(PartyGetPartyInfoEvent, self).on_perform()
        party = Party.search(name=self.name)
        if party is None: return
        if (self.agent.party is party) or (party.has_invite(agent=self.agent)):
            PartyInfoMessage(agent=self.agent, time=self.time, party=party).post()


class PartyGetPartyUserInfoEvent(Event):
    def __init__(self, name, agent, **kw):
        assert (name is not None) and (agent is not None)
        super(PartyGetPartyUserInfoEvent, self).__init__(server=agent.server, **kw)
        self.name = name
        self.agent = agent

    def on_perform(self):
        super(PartyGetPartyUserInfoEvent, self).on_perform()
        # todo: проверить можно ли отправлять инфу
        PartyUserInfoMessage(agent=self.agent, time=self.time, player_nick=self.name).post()


class PartyGetAllInvitesEvent(Event):
    def __init__(self, agent, **kw):
        assert (agent is not None)
        super(PartyGetAllInvitesEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(PartyGetAllInvitesEvent, self).on_perform()
        for invite in self.agent.invites:
            PartyInviteMessage(agent=self.agent, sender=invite.sender, recipient=self.agent, party=invite.party,
                               invite=invite, time=self.time).post()


class PartyIncludeEvent(Event):
    def __init__(self, party, agent, **kw):
        assert (party is not None) and (agent is not None)
        super(PartyIncludeEvent, self).__init__(server=agent.server, **kw)
        self.party = party
        self.agent = agent

    def on_perform(self):
        super(PartyIncludeEvent, self).on_perform()
        self.party.on_include(agent=self.agent, time=self.time)


class PartyExcludeEvent(Event):
    def __init__(self, party, agent, **kw):
        assert (party is not None) and (agent is not None)
        super(PartyExcludeEvent, self).__init__(server=agent.server, **kw)
        self.party = party
        self.agent = agent

    def on_perform(self):
        super(PartyExcludeEvent, self).on_perform()
        self.party.on_exclude(agent=self.agent, time=self.time)


class PartyKickEvent(Event):
    def __init__(self, party, kicker, kicked, **kw):
        super(PartyKickEvent, self).__init__(server=kicker.server, **kw)
        self.party = party
        self.kicker = kicker
        self.kicked = kicked

    def on_perform(self):
        super(PartyKickEvent, self).on_perform()
        self.party.on_kick(kicker=self.kicker, kicked=self.kicked, time=self.time)


class PartyInviteEvent(Event):
    def __init__(self, party, sender, recipient, **kw):
        super(PartyInviteEvent, self).__init__(server=sender.server, **kw)
        self.party = party
        self.sender = sender
        self.recipient = recipient

    def on_perform(self):
        super(PartyInviteEvent, self).on_perform()
        self.party.on_invite(event=self)


class PartyInviteDeleteEvent(Event):
    def __init__(self, invite, **kw):
        super(PartyInviteDeleteEvent, self).__init__(server=invite.sender.server, **kw)
        self.invite = invite

    def on_perform(self):
        super(PartyInviteDeleteEvent, self).on_perform()
        self.invite.delete_invite(time=self.time)


class PartyDeleteEvent(Event):
    def __init__(self, party, **kw):
        super(PartyDeleteEvent, self).__init__(**kw)
        self.party = party

    def on_perform(self):
        super(PartyDeleteEvent, self).on_perform()
        del self.party.parties[self.party.name]
        all_invites = self.party.invites[:]
        for invite in all_invites:
            invite.delete_invite(time=self.time)
        self.party.room.delete_room(time=self.time)


class Invite(object):
    def __init__(self, sender, recipient, party, time):
        assert (recipient is not None) and (party is not None)
        self.sender = sender
        self.recipient = recipient
        self.party = party

        # Все члены пати должны знать кого пригласили
        for member in self.party.members:
            PartyInviteMessage(agent=member.agent, sender=sender, recipient=recipient, party=party, invite=self,
                               time=time).post()

        # Приглашенный тоже должен об этом узнать
        PartyInviteMessage(agent=recipient, sender=sender, recipient=recipient, party=party, invite=self,
                           time=time).post()

        # Добавляем приглашение в список приглашений party
        self.party.invites.append(self)
        self.recipient.invites.append(self)

    id = property(id)

    def can_delete_by_agent(self, agent):
        # отменить инвайт могут: sender, recipient, owner пати
        return (agent == self.sender) or (agent == self.recipient) or (agent == self.party.owner)

    def delete_invite(self, time):
        # все участники пати должны узнать, что инвайт отменён
        for member in self.party.members:
            PartyInviteDeleteMessage(agent=member.agent, sender=self.sender,
                                     recipient=self.recipient, party=self.party, invite=self, time=time).post()

        # Приглашаемый тоже должен об этом узнать
        PartyInviteDeleteMessage(agent=self.recipient, sender=self.sender, time=time,
                                 recipient=self.recipient, party=self.party, invite=self).post()

        if self in self.party.invites:
            self.party.invites.remove(self)
        if self in self.recipient.invites:
            self.recipient.invites.remove(self)


class PartyMember(object):
    def __init__(self, agent, party, time, category=2):
        u"""
            category - значимость участника группы. 0 - глава, 1 - зам, 2 - рядовой
        """
        assert (agent is not None) and (party is not None)
        self.agent = agent
        self.party = party
        self.description = None
        self.role = None
        self._category = category
        # Включение в мемберы пати нового мембера
        party.members.append(self)
        # Отправка ему специального сообщения (с мемберами, чтобы он знал кто из его пати)
        PartyIncludeMessageForIncluded(agent=agent, subj=agent, party=party, time=time).post()
        # Рассылка всем агентам, которые видят машинки добавляемого агента
        if agent.car is not None:
            for sbscr_agent in agent.car.subscribed_agents:
                AgentPartyChangeMessage(agent=sbscr_agent, subj=agent, time=time).post()
        else:
            for member in self.party.members:
                AgentPartyChangeMessage(agent=member.agent, subj=self.agent, time=time).post()

    def out_from_party(self, time):
        # Исключение мембера из пати
        self.party.members.remove(self)
        # Отправка специального сообщения исключённому (вышедшему) агенту
        PartyExcludeMessageForExcluded(agent=self.agent, subj=self.agent, party=self.party, time=time).post()
        # Рассылка всем агентам, которые видят машинки удаляемого агента
        if self.agent.car is not None:
            for sbscr_agent in self.agent.car.subscribed_agents:
                AgentPartyChangeMessage(agent=sbscr_agent, subj=self.agent, time=time).post()
        else:
            for member in self.party.members:
                AgentPartyChangeMessage(agent=member.agent, subj=self.agent, time=time).post()

    def kick_from_party(self, time):
        # Исключение мембера из пати
        self.party.members.remove(self)
        # Отправка специального сообщения исключённому (вышедшему) агенту
        PartyKickMessageForKicked(agent=self.agent, subj=self.agent, party=self.party, time=time).post()
        # Рассылка всем агентам, которые видят машинки удаляемого агента
        if self.agent.car is not None:
            for sbscr_agent in self.agent.car.subscribed_agents:
                AgentPartyChangeMessage(agent=sbscr_agent, subj=self.agent, time=time).post()
        else:
            for member in self.party.members:
                AgentPartyChangeMessage(agent=member.agent, subj=self.agent, time=time).post()

    @property
    def category(self):
        return self._category

    @category.setter
    def category(self, new_category):
        self._category = new_category

    def set_description(self, new_description):
        # todo: Сделать свойством
        self.description = new_description
        # todo: рассылка сообщений мемберам пати

    def as_dict(self):
        return dict(
            agent_name=self.agent._login,
            agent_uid=self.agent.uid,
            description=self.description,
            category=self.category,
        )

    # определяет, может ли данный мембер кидать инвайты
    def can_invite(self):
        return self.category < 2

    # определяет, может ли данный мембер кикнуть хоть кого-нибудь
    def can_kick(self):
        return self.category < 2

    # определяет, может ли данный мембер кикнуть другого мембера
    def can_kick_member(self, member):
        if not (self.party is member.party):
            return False
        return (self.category < member.category) or (self is member)


class Party(object):
    parties = {}

    def __init__(self, time, owner, name=None, description='', exp_share=False):
        if (name is None) or (name == ''):
            name = unicode(self.classname)
        while name in self.parties:
            name = inc_name_number(name)
        self.parties[name] = self
        self.description = description
        self.name = name
        self.owner = owner
        self.share_obs = []
        self.members = []
        self.invites = []
        self.exp_share = exp_share

        self.capacity_table = self.owner.server.reg.get('/registry/rpg_settings/partytable')

        self.party_exp_modifier = 1
        self.change_exp_modifier()

        # создание чат-комнаты пати
        self.room = PartyChatRoom(time=time, name=name)
        self.include(owner, time=time)

        # механизм удаления пати
        self.delete_event = None

    @property
    def classname(self):
        return self.__class__.__name__

    @classmethod
    def search(cls, name):
        return cls.parties.get(name)

    @classmethod
    def search_or_create(cls, name):
        return cls.search(name) or cls(name)

    def has_invite(self, agent):
        for inv in self.invites:
            if inv.recipient == agent:
                return True
        return False

    def _del_invites_by_agent(self, agent, time):
        temp_invites = self.invites[:]
        for inv in temp_invites:
            if inv.recipient == agent:
                inv.delete_invite(time=time)

    def as_dict(self, with_members=False):
        d = dict(
            name=self.name,
            id=self.id,
            share_exp=self.exp_share,
        )
        if with_members:
            d.update(
                members=[member.as_dict() for member in self.members]
            )
        return d

    def get_member_by_agent(self, agent):
        for member in self.members:
            if member.agent == agent:
                return member
        return None

    def include(self, agent, time):
        PartyIncludeEvent(party=self, agent=agent, time=time).post()

    def on_include(self, agent, time):
        if self.delete_event is not None:
            PartyErrorMessage(agent=agent, time=time, comment='Party is not exist').post()
            return

        if self.capacity_table.get_party_capacity(agent=self.owner.example) <= len(self.members):
            PartyErrorMessage(agent=agent, comment='Party is full', time=time).post()
            PartyErrorMessage(agent=self.owner, comment='Party is full', time=time).post()
            return

        old_party = agent.party
        if not (old_party is self):
            if old_party:
                old_party.on_exclude(agent, time=time)
        else:
            return

        # проверка по инвайтам
        if agent != self.owner:
            if not self.has_invite(agent):
                PartyErrorMessage(agent=agent, time=time, comment='You do not have invite for this party').post()
                return
        self._del_invites_by_agent(agent, time=time)

        # before include for members and agent
        agent.party_before_include(new_member=agent, party=self, time=time)
        for member in self.members:
            member.agent.party_before_include(new_member=agent, party=self, time=time)

        self._on_include(agent=agent, time=time)
        PartyMember(agent=agent, party=self, category=(0 if self.owner == agent else 2), time=time)
        agent.party = self
        # todo: проблемы с русским языком ##review(svp)
        # log.info('Agent %s included to party %s. Car=%s', agent, self, agent.car)

        # after include for members
        for member in self.members:
            member.agent.party_after_include(new_member=agent, party=self, time=time)

        # включить агента в чат-комнату пати
        self.room.include(agent=agent, time=time)

    def _on_include(self, agent, time):
        # log.info('==============Start include')
        # log.info(len(self.share_obs))

        agent_observers = agent.observers.keys()
        for obs in agent_observers:
            self.share_obs.append(obs)

        for member in self.members:
            for obs in agent_observers:
                member.agent.add_observer(observer=obs, time=time)

        for obs in self.share_obs:
            agent.add_observer(observer=obs, time=time)

        # log.info(len(self.share_obs))
        # log.info('==============End include')

    def exclude(self, agent, time):
        PartyExcludeEvent(party=self, agent=agent, time=time).post()

    def on_exclude(self, agent, time):
        out_member = self.get_member_by_agent(agent)
        if (agent.party is not self) or (out_member is None):
            log.warning('Trying to exclude unaffilated agent (%s) from party %s', agent, self)
            return

        # before exclude for members
        for member in self.members:
            member.agent.party_before_exclude(old_member=agent, party=self, time=time)

        agent.party = None
        out_member.out_from_party(time=time)
        if len(self.members) == 0:
            self.delete_event = PartyDeleteEvent(server=self.owner.server, time=time, party=self)
            self.delete_event.post()
        self._on_exclude(agent=agent, time=time)
        # log.info('Agent %s excluded from party %s', agent, self)

        # Если ушёл создатель пати, то назначить другого
        if len(self.members) > 0 and agent is self.owner:  # Если есть ещё мембы
            self.change_owner(time)

        # after exclude for members and agent
        agent.party_after_exclude(old_member=agent, party=self, time=time)
        for member in self.members:
            member.agent.party_after_exclude(old_member=agent, party=self, time=time)

        # исключить агента из чат-комнаты пати
        self.room.exclude(agent=agent, time=time)

    def _on_exclude(self, agent, time):
        # log.info('---------------Start exclude')
        # log.info(len(self.share_obs))

        for obs in self.share_obs:
            agent.drop_observer(observer=obs, time=time)

        agent_observers = agent.observers.keys()
        for member in self.members:
            for obs in agent_observers:
                member.agent.drop_observer(observer=obs, time=time)

        for obs in agent_observers:
            self.share_obs.remove(obs)

        # log.info(len(self.share_obs))
        # log.info('---------------End exclude')

    def drop_observer_from_party(self, observer, time):
        if observer in self.share_obs:
            self.share_obs.remove(observer)
        for member in self.members:
            member.agent.drop_observer(observer=observer, time=time)

    def add_observer_to_party(self, observer, time):
        if not (observer in self.share_obs):
            self.share_obs.append(observer)
        for member in self.members:
            member.agent.add_observer(observer=observer, time=time)

    def invite(self, sender, recipient, time):
        PartyInviteEvent(party=self, sender=sender, recipient=recipient, time=time).post()

    def on_invite(self, event):
        sender = event.sender
        recipient = event.recipient
        if not sender in self:
            PartyErrorMessage(agent=sender, comment='Sender not in party', time=event.time).post()
            # todoL (!) Определить является ли эти ситуации штатными. Проверить правильно ли передал время.
            return
        if recipient in self:
            PartyErrorMessage(agent=sender, comment='Recipient in party', time=event.time).post()
            return

        member_sender = self.get_member_by_agent(sender)
        if member_sender.category > 1:
            PartyErrorMessage(agent=sender, comment='Sender do not have rights', time=event.time).post()
            return

        for inv in self.invites:
            if (inv.sender == sender) and (inv.recipient == recipient):
                PartyErrorMessage(agent=sender, comment='Invite already exists', time=event.time).post()
                return
        Invite(sender=sender, recipient=recipient, party=self, time=event.time)

    def __len__(self):
        return len(self.members)

    def __str__(self):
        return '<Party {self.name!r}/{n}>'.format(self=self, n=len(self))

    @property
    def all_agents(self):
        return [m.agent for m in self.members]

    @property
    def slug(self):
        # todo: cache it #optimize
        return 'party__{}'.format(id(self))  # todo: use slug of name

    def as_html(self):
        return u'<a class="party_link" id="{party.slug}">{party.name}</a>'.format(party=self)

    id = property(id)

    def __contains__(self, agent):
        if agent is None:
            return False
        for member in self.members:
            if member.agent == agent:
                return True
        return False

    def kick(self, kicker, kicked, time):
        PartyKickEvent(party=self, kicker=kicker, kicked=kicked, time=time).post()

    def on_kick(self, kicker, kicked, time):
        kicker_member = self.get_member_by_agent(kicker)
        kicked_member = self.get_member_by_agent(kicked)
        if kicker.party is not self or kicked.party is not self or kicker_member is None or kicked_member is None:
            # todo: Похоже здесь должно быть исключение. Уточнить.
            log.warning('%s trying to kick agent (%s) from party %s', kicker, kicked, self)
            return
        if not kicker_member.can_kick_member(kicked_member):
            # todo: Похоже здесь должно быть исключение. Уточнить.
            log.warning('%s dont have rights to kick (%s) from party %s', kicker, kicked, self)
            PartyErrorMessage(agent=kicker, comment='Dont have rights for kick', time=time).post()
            return

        # before exclude for members
        for member in self.members:
            member.agent.party_before_exclude(old_member=kicked, party=self, time=time)

        kicked.party = None
        kicked_member.kick_from_party(time=time)
        if len(self.members) == 0:
            self.delete_event = PartyDeleteEvent(server=self.owner.server, time=time, party=self)
            self.delete_event.post()
        self._on_exclude(agent=kicked, time=time)
        log.info('Agent %s kick from party %s', kicked, self)

        # Если ушёл создатель пати, то назначить другого
        if len(self.members) > 0 and kicked is self.owner:  # Если есть ещё мембы
            self.change_owner(time)

        # after exclude for members and agent
        kicked.party_after_exclude(old_member=kicked, party=self, time=time)
        for member in self.members:
            member.agent.party_after_exclude(old_member=kicked, party=self, time=time)

        # исключить агента из чат-комнаты пати
        self.room.exclude(agent=kicked, time=time)

    def change_owner(self, time):
        # Выбрать первого мембера с минимальной категорией
        all_members = self.members[:]
        sorted_members = sorted(all_members, key=lambda member: member.category)
        candidate = sorted_members[0]
        candidate.category = 0
        self.owner = candidate.agent
        # log.info('Agent %s now new owner for party %s', self.owner, self)
        for member in self.members:
            PartyInfoMessage(agent=member.agent, time=time, party=self).post()

    def on_exp(self, agent, dvalue, event):
        dvalue *= self.party_exp_modifier  # Будет свегда повышенный опыт, даже когда не шарится опыт
        if self.exp_share and self.members:
            val = round(dvalue / len(self.members))
            for member in self.members:
                member.agent.example.profile.set_exp(dvalue=val, time=event.time)

            # Отправка лидеру пати квестового эвента с количеством экспы заработанным агентом
            self.owner.example.profile.on_event(event=event, cls=OnPartyExp, agents=self.all_agents, exp=val, party=self)
        else:
            agent.example.profile.set_exp(dvalue=dvalue, time=event.time)
            # Отправка лидеру пати квестового эвента с количеством экспы заработанным агентом
            self.owner.example.profile.on_event(event=event, cls=OnPartyExp, agents=[agent], exp=dvalue, party=self)

    @event_deco
    def change_share_option(self, event, agent, share_exp):
        if self.owner is not agent:
            return
        if self.exp_share == share_exp:
            return
        self.exp_share = share_exp

        for member in self.members:
            PartyInfoMessage(agent=member.agent, time=event.time, party=self).post()

    def change_exp_modifier(self):
        self.party_exp_modifier = self.owner.example.profile.get_party_exp_modifier()
