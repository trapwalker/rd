# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import Item
from sublayers_server.model.registry.attr import TextAttribute
from sublayers_server.model.utils import SubscriptionList


class O(dict):
    def __init__(self):
        super(O, self).__init__()
        self.__dict__ = self


class State(O):
    def __init__(self, quest, name, **kw):
        super(State, self).__init__()
        self.name = name or self.__class__.__name__
        self.quest = quest
        self.__dict__.update(kw)
        self.on_state_init()

    # todo: __getstate__ ##realize
    # todo: __setstate__ ##realize

    def subscribe(self, target):
        if isinstance(target, SubscriptionList):
            target.add(self)
        elif hasattr(target, 'subscriptions'):
            target.subscriptions.add(self)
        else:
            raise TypeError(u"State {!r} of quest {!r} can not be subscribed to {!r}".format(self, self.quest, target))

    def unsubscribe(self, target):
        if isinstance(target, SubscriptionList):
            target.remove(self)
        elif hasattr(target, 'subscriptions'):
            target.subscriptions.remove(self)
        else:
            raise TypeError(u"State {!r} of quest {!r} can not be unsubscribed from {!r}".format(
                self, self.quest, target))

    def as_dict(self):
        d = self.__dict__.copy()
        del d['quest']
        return d

    def on_inv_change(self):
        # todo: diff argument
        log.debug('%s:: on_inv_change()', self)

    def on_kill(self, killed_car):
        log.debug('%s:: on_kill(%s)', self, killed_car)

    def on_enter_location(self, location):
        log.debug('%s:: on_enter_location(%s)', self, location)

    def on_exit_location(self, location):
        log.debug('%s:: on_exit_location(%s)', self, location)

    def on_enter_npc(self, npc):
        log.debug('%s:: on_enter_npc(%s)', self, npc)

    def on_exit_npc(self, npc):
        log.debug('%s:: on_exit_npc(%s)', self, npc)

    def on_die(self):
        log.debug('%s:: on_die()', self)

    def on_trade_enter(self, user):
        log.debug('%s:: on_trade_enter(%s)', self, user)

    def on_trade_exit(self, user, canceled, buy, sale, cost):
        log.debug('%s:: on_trade_exit(user=%r, cancelled=%r, buy=%r, sale=%r, cost=%r)',
                  self, user, canceled, buy, sale, cost)

    def on_state_init(self):
        pass

    def on_state_enter(self, old_state):
        self.subscribe(self.quest.agent)

    def on_state_exit(self, next_state):
        self.unsubscribe(self.quest.agent)


class FinalState(State):
    def on_state_enter(self, old_state):
        pass

    def on_state_exit(self, next_state):
        pass


# Условия:
# - has([items], who=None)  # money too
# - attend(point|login|location|npc, who=None, radius=None, duration=None)
# - die(login|prototype|uid|None, count=1)  # None == self
# - buy(login|location|npc, [items], cost=None)
# - sale(login|location|npc, [items], cost=None)
# - time(duration)
# - trigger(name, value=None)
# - heal(login|prototype|uid, count=1)

# Действия:
# - give([items])
# - drop([items])
# - tp(point|login|location|npc, who=Mone, radius=None)
# - kill(login|uid)
# - confiscate([items])
# - нанести урон
# - say(text, npc=None|link, dest=login|None)
# - ask(variants={True: 'Yes', False: 'None'}, text=None, title=None)
# - log(text, position=None, dest=login|None)
## - like(diff=1, dest=login|None, who=None|npc|location)


class Quest(Item):
    first_state = TextAttribute(default='Begin', caption=u'Начальное состояние', doc=u'Имя начального состояния квеста')

    def __init__(self, agent=None, **kw):
        super(Quest, self).__init__(**kw)
        self.agent = agent
        # todo: log warning if agent and abstract inconsistency
        self._state = None
        self.state = self.first_state

    @property
    def state(self):
        return self._state

    @state.setter
    def state(self, value):
        assert value
        if isinstance(value, State):
            new_state = value
        else:
            if isinstance(value, str):
                new_state_cls = getattr(self, value)
                new_state_name = value
            elif isinstance(value, type):
                new_state_cls = value
                new_state_name = new_state_cls.__name__
            else:
                raise TypeError('Try to set state by {!r}'.format(value))

            new_state = new_state_cls(quest=self, name=new_state_name)

        old_state = self._state

        if old_state is not None:
            old_state.on_state_exit(next_state=new_state)

        self._state = new_state
        new_state.on_state_enter(old_state=old_state)

    def __getstate__(self):
        d = super(Quest, self).__getstate__()
        d.update(state=self.state.as_dict())
        return d

    def __setstate__(self, state):
        st = state.pop('state', None)
        if st:
            self.state = getattr(self, st['name'])(quest=self, **st)
        super(Quest, self).__setstate__(state)

    class Begin(State):
        u"""Стартовое состояние квеста"""
        caption = u'Начало'

    class Win(FinalState):
        u"""Состояние успешного прохождения квеста"""
        caption = u'Успех'

    class Fail(FinalState):
        u"""Состояния провала квеста"""
        caption = u'Провал'


class UserQuest(Quest):
    class Begin(Quest.Begin):
        pass


class QNKills(Quest):

    class Begin(State):
        def on_state_init(self):
            State.on_state_init(self)
            self.kills_count = 0

        def on_kill(self, killed_car):
            super(QNKills.Begin, self).on_kill(killed_car)
            self.kills_count += 1
            if self.kills_count >= 5:
                self.quest.state = self.quest.Win


class QMortalCurse(Quest):
    u"""Смертное прокльятье.
    Каждое 13 убийство влечет смерть самого игрока.
    Избавиться можно только пожертвовав 13 разным проходимцам какие-нибудь вещи бесплатно.
    """

    class Begin(State):
        caption = u'Начало'

        def on_state_init(self):
            State.on_state_init(self)
            self.kills_count = 0
            self.tramps = set()
            self.magic_count = 13

        def on_kill(self, killed_car):
            State.on_kill(self, killed_car)
            self.kills_count += 1
            if (self.kills_count % self.magic_count) == 0:
                self.quest.agent.die()

        def on_trade_exit(self, user, canceled, buy, sale, cost):
            State.on_trade_exit(self, user, canceled, buy, sale, cost)
            if sale and not buy and cost == 0:
                self.tramps.add(user.login)
                if len(self.tramps) >= self.magic_count:
                    self.quest.state = self.quest.Win
