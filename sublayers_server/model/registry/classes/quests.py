# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import Item
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.attr import Attribute, TextAttribute


class O(dict):
    def __init__(self):
        super(O, self).__init__()
        self.__dict__ = self


class State(O):
    def __init__(self, quest, name):
        super(State, self).__init__()
        self.name = name or self.__class__.__name__
        self.quest = quest

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

    def on_state_exit(self, next_state):
        pass

    def on_state_enter(self, old_state):
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
# - log(text, position=None, dest=login|None)
# - like(diff=1, dest=login|None, who=None|npc|location)


class Quest(Item):
    first_state = TextAttribute(default='begin', caption=u'Начальное состояние', doc=u'Имя начального состояния квеста')
    state_name = TextAttribute(caption=u'Текущее состояние', doc=u'Имя текущего состояния квеста')

    def __init__(self, **kw):
        super(Quest, self).__init__(**kw)
        self._state = None
        self.state = self.state_name

    @property
    def state(self):
        return self._state

    @state.setter
    def state(self, new_state):
        assert new_state
        if isinstance(new_state, str):
            new_state_name = new_state
            new_state = getattr(self, new_state_name)(quest=self, name=new_state_name)
        else:
            new_state_name = new_state.name

        old_state = self._state

        if old_state is not None:
            old_state.on_state_exit(next_state=new_state)

        self._state = new_state
        new_state.on_state_enter(old_state=old_state)
        self.state_name = new_state_name

    def __getstate__(self):
        d = super(Quest, self).__getstate__()
        d.update(state=self.state)
        return d

    def __setstate__(self, state):
        self.state = state.pop('state', None)
        super(Quest, self).__setstate__(state)

    class Begin(State):
        u'Стартовое состояние квеста'
        caption = u'Начало'

    class Win(State):
        u'Состояние успешного прохождения квеста'
        caption = u'Успех'

    class Fail(State):
        u'Состояния провала квеста'
        caption = u'Провал'


class QNKills(Quest):

    class Begin(State):
        u'Стартовое состояние квеста'
        caption = u'Начало'

        def on_kill(self, killed_car):
            super(QNKills.Begin, self).on_kill(killed_car)

