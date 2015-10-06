# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import Item
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.attr import Attribute, TextAttribute


class State(dict):
    def __init__(self, name):
        super(State, self).__init__()
        self['name'] = name
        self.__dict__ = self


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
    state = TextAttribute(caption=u'Текущее состояние', doc=u'Имя текущего состояния квеста')

    begin = Attribute(default=State('begin'), caption=u'Начало', doc=u'Стартовое состояние квеста')
    win = Attribute(default=State('win'), caption=u'Успех', doc=u'Состояние успешного прохождения квеста')
    fail = Attribute(default=State('fail'), caption=u'Провал', doc=u'Состояния провала квеста')

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
