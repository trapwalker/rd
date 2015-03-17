# -*- coding: utf-8 -*-

import logging

log = logging.getLogger(__name__)

from events import Event
from messages import PartyInviteMessage, PartyIncludeMessage, PartyExcludeMessage, PartyExcludeMessageForExcluded, \
    PartyIncludeMessageForIncluded


def inc_name_number(name):
    clear_name = name.rstrip('0123456789')
    num = int(name[len(clear_name):] or '0') + 1
    return '{}{}'.format(clear_name, num)


class PartyIncludeEvent(Event):
    def __init__(self, party, agent, **kw):
        assert (party is not None) and (agent is not None)
        super(PartyIncludeEvent, self).__init__(server=agent.server, **kw)
        self.party = party
        self.agent = agent

    def on_perform(self):
        super(PartyIncludeEvent, self).on_perform()
        self.party.on_include(self.agent)


class PartyExcludeEvent(Event):
    def __init__(self, party, agent, **kw):
        assert (party is not None) and (agent is not None)
        super(PartyExcludeEvent, self).__init__(server=agent.server, **kw)
        self.party = party
        self.agent = agent

    def on_perform(self):
        super(PartyExcludeEvent, self).on_perform()
        self.party.on_exclude(self.agent)


class Invite(object):
    def __init__(self, sender, recipient, party):
        assert (recipient is not None) and (party is not None)
        self.sender = sender
        self.recipient = recipient
        self.party = party

        # Все члены пати должны знать кого пригласили
        for member in self.party.members:
            PartyInviteMessage(agent=member, sender=sender, recipient=recipient, party=party).post()

        # Приглашенный тоже должен об этом узнать
        PartyInviteMessage(agent=recipient, sender=sender, recipient=recipient, party=party).post()

        # Добавляем приглашение в список приглашений party
        self.party.invites.append(self)

    def delete(self):
        if self in self.party.invites:
            self.party.invites.remove(self)


class PartyMember(object):

    # Распределение ролей в пати:
    #       'Owner' - глава пати
    #       'Admin' - заместитель главы пати
    #       'Normal' - обычный участник

    def __init__(self, agent, party, role='Normal'):
        assert (agent is not None) and (party is not None)
        self.agent = agent
        self.party = party
        self.description = None
        self.role = None
        self.set_role(role)
        # Рассылка всем мемберам сообщения о новом члене пати
        for member in self.party.members:
            PartyIncludeMessage(agent=member.agent, subj=self.agent, party=party).post()
        # Включение в мемберы пати нового мембера
        party.members.append(self)
        # Отправка ему специального сообщения (с мемберами, чтобы он знал кто из его пати)
        PartyIncludeMessageForIncluded(agent=agent, subj=agent, party=party).post()

    def out_from_party(self):
        # Исключение мембера из пати
        self.party.members.remove(self)
        # Отправка специального сообщения исключённому (вышедшему) агенту
        PartyExcludeMessageForExcluded(agent=self.agent, subj=self.agent, party=self.party).post()
        # Рассылка всем сообщения о вышедшем из пати агенте
        for member in self.party.members:
            PartyExcludeMessage(agent=member.agent, subj=self.agent, party=self.party).post()

    def set_role(self, role):
        self.role = role
        # todo: сообщение о присвоении роли

    def set_description(self, new_description):
        self.description = new_description

    def as_dict(self):
        return dict(
            agent_name=self.agent.login,
            agent_uid=self.agent.uid,
            description=self.description,
            role=self.role
        )


class Party(object):
    parties = {}

    def __init__(self, owner=None, name=None):
        if name is None:
            name = self.classname
        while name in self.parties:
            name = inc_name_number(name)
        self.parties[name] = self
        self.name = name
        self.owner = owner
        self.share_obs = []
        self.members = []
        self.invites = []
        if owner is not None:
            self.include(owner)

    @property
    def classname(self):
        return self.__class__.__name__

    @classmethod
    def search(cls, name):
        return cls.parties.get(name)

    @classmethod
    def search_or_create(cls, name):
        return cls.search(name) or cls(name)

    def as_dict(self, with_members=False):
        d = dict(
            name=self.name,
            id=self.id,
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

    def include(self, agent):
        PartyIncludeEvent(party=self, agent=agent).post()

    def on_include(self, agent):
        old_party = agent.party
        if old_party is self:
            return

        # before include for members and agent
        agent.party_before_include(new_member=agent, party=self)
        for member in self.members:
            member.agent.party_before_include(new_member=agent, party=self)

        if old_party:
            old_party.exclude(agent)

        self._on_include(agent)
        PartyMember(agent=agent, party=self, role=('Owner' if self.owner == agent else None))
        agent.party = self
        log.info('Agent %s included to party %s. Cars=%s', agent, self, agent.cars)

        # after include for members
        for member in self.members:
            member.agent.party_after_include(new_member=agent, party=self)

    def _on_include(self, agent):
        #log.info('==============Start include')
        #log.info(len(self.share_obs))

        agent_observers = agent.observers.keys()
        for obs in agent_observers:
            if agent.observers[obs] > 0:
                self.share_obs.append(obs)

        for member in self.members:
            for obs in agent_observers:
                if agent.observers[obs] > 0:
                    member.agent.add_observer(obs)

        for obs in self.share_obs:
            agent.add_observer(obs)

        #log.info(len(self.share_obs))
        #log.info('==============End include')

    def exclude(self, agent):
        PartyExcludeEvent(party=self, agent=agent).post()

    def on_exclude(self, agent):
        out_member = self.get_member_by_agent(agent)
        if (agent.party is not self) or (out_member is None):
            log.warning('Trying to exclude unaffilated agent (%s) from party %s', agent, self)
            return

        # before exclude for members
        for member in self.members:
            member.agent.party_before_exclude(old_member=agent, party=self)

        agent.party = None
        out_member.out_from_party()
        self._on_exclude(agent)
        log.info('Agent %s excluded from party %s', agent, self)

        # after exclude for members and agent
        agent.party_after_exclude(old_member=agent, party=self)
        for member in self.members:
            member.agent.party_after_exclude(old_member=agent, party=self)

    def _on_exclude(self, agent):
        #log.info('---------------Start exclude')
        #log.info(len(self.share_obs))

        for obs in self.share_obs:
            agent.drop_observer(obs)

        agent_observers = agent.observers.keys()
        for member in self.members:
            for obs in agent_observers:
                if agent.observers[obs] > 0:
                    member.agent.drop_observer(obs)

        for obs in agent_observers:
            if agent.observers[obs] > 0:
                self.share_obs.remove(obs)

        #log.info(len(self.share_obs))
        #log.info('---------------End exclude')

    def drop_observer_from_party(self, observer):
        if observer in self.share_obs:
            self.share_obs.remove(observer)
        for member in self.members:
            member.agent.drop_observer(observer)

    def add_observer_to_party(self, observer):
        if not (observer in self.share_obs):
            self.share_obs.append(observer)
        for member in self.members:
            member.agent.add_observer(observer)

    def invite(self, user):
        pass

    def __len__(self):
        return len(self.members)

    def __str__(self):
        return '<Party {self.name}/{n}>'.format(self=self, n=len(self))

    id = property(id)

    def __contains__(self, agent):
        return agent in self.members