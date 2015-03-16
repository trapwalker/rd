# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from events import Event
from messages import PartyInviteMessage, PartyIncludeMessage, PartyExcludeMessage


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


class PartyInviteTimeOutEvent(Event):
    def __init__(self, invite, **kw):
        assert (invite is not None)
        super(PartyInviteTimeOutEvent, self).__init__(server=invite.party.owner.server, **kw)
        self.invite = invite

    def on_perform(self):
        super(PartyInviteTimeOutEvent, self).on_perform()
        self.invite.delete_by_time()


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

        # Создаем ивент истечения срока действия приглашения
        # todo: вынести время жизни приглашения в баланс
        self.time_out_event = PartyInviteTimeOutEvent(invite=self,
                                                      time=(self.party.owner.server.get_time() + 300)).post()

    def delete_by_user(self):
        # Отменяем ивент истечения срока действия приглашения
        self.time_out_event.cancel()
        self.time_out_event = None
        self._delete()

    def delete_by_time(self):
        self._delete()

    def _delete(self):
        if self in self.party.invites:
            self.party.invites.remove(self)


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
        self.members = []  # todo: may be set of agents?
        """@type list[agents.Agent]"""
        self.invites = []  # todo: may be set of agents?
        """@type list[agents.Agent]"""
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

    def as_dict(self):
        return dict(
            name=self.name,
            id=self.id,
        )

    def include(self, agent):
        PartyIncludeEvent(party=self, agent=agent).post()

    def on_include(self, agent):
        old_party = agent.party
        if old_party is self:
            return

        # before include for members and agent
        agent.party_before_include(new_member=agent, party=self)
        for member in self.members:
            member.party_before_include(new_member=agent, party=self)

        if old_party:
            old_party.exclude(agent)

        self._on_include(agent)
        self.members.append(agent)

        # Рассылка всем сообщения о новом члене пати
        #for member in self.members:
        #    PartyIncludeMessage(agent=member, subj=agent, party=self).post()

        agent.party = self
        log.info('Agent %s included to party %s. Cars=%s', agent, self, agent.cars)
        #agent.on_change_party(old=old_party)  todo: realize

        # after include for members
        for member in self.members:
            member.party_after_include(new_member=agent, party=self)

    def _on_include(self, agent):
        #log.info('==============Start include')
        #log.info(len(self.share_obs))
        agent_observers = agent.observers.keys()

        for obs in agent_observers:
            if agent.observers[obs] > 0:
                self.share_obs.append(obs)

        for agt in self.members:
            for obs in agent_observers:
                if agent.observers[obs] > 0:
                    agt.add_observer(obs)

        for o in self.share_obs:
            agent.add_observer(o)
        #log.info(len(self.share_obs))
        #log.info('==============End include')

    def exclude(self, agent):
        PartyExcludeEvent(party=self, agent=agent).post()

    def on_exclude(self, agent):
        if agent.party is not self:
            log.warning('Trying to exclude unaffilated agent (%s) from party %s', agent, self)
            return

        # before exclude for members
        for member in self.members:
            member.party_before_exclude(old_member=agent, party=self)

        # Рассылка всем сообщения о вышедшем из пати агенте
        #for member in self.members:
        #    PartyExcludeMessage(agent=member, subj=agent, party=self).post()

        agent.party = None
        self.members.remove(agent)

        self._on_exclude(agent)
        log.info('Agent %s excluded from party %s', agent, self)
        #if not silent: agent.on_change_party(self)  # todo: realize

        # after exclude for members and agent
        agent.party_after_exclude(old_member=agent, party=self)
        for member in self.members:
            member.party_after_exclude(old_member=agent, party=self)

    def _on_exclude(self, agent):
        #log.info('---------------Start exclude')
        #log.info(len(self.share_obs))

        for o in self.share_obs:
            agent.drop_observer(o)

        agent_observers = agent.observers.keys()
        for a in self.members:
            for obs in agent_observers:
                if agent.observers[obs] > 0:
                    a.drop_observer(obs)

        for obs in agent_observers:
            if agent.observers[obs] > 0:
                self.share_obs.remove(obs)

        #log.info(len(self.share_obs))
        #log.info('---------------End exclude')

    def drop_observer_from_party(self, observer):
        if observer in self.share_obs:
            self.share_obs.remove(observer)
        for member in self.members:
            member.drop_observer(observer)

    def add_observer_to_party(self, observer):
        if not (observer in self.share_obs):
            self.share_obs.append(observer)
        for member in self.members:
            member.add_observer(observer)

    def invite(self, user):
        if user not in self.invites:
            self.invites.append(user)
            # todo: send invitation message

    def __len__(self):
        return len(self.members)

    def __str__(self):
        return '<Party {self.name}/{n}>'.format(self=self, n=len(self))

    id = property(id)

    def __contains__(self, agent):
        return agent in self.members