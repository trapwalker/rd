# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event
from sublayers_server.model.registry_me.tree import Subdoc, FloatField, StringField, UUIDField


class QuestEvent(Event):
    def __init__(self, server, time, quest, callback_before=None, callback_after=None, comment=None, **kw):
        super(QuestEvent, self).__init__(
            server=server,
            time=time,
            callback_before=callback_before,
            callback_after=callback_after,
            comment=comment,
        )
        self.quest = quest
        self.__dict__.update(kw)

    def on_perform(self):
        self.quest.do_event(event=self)


class QuestTimer(Subdoc):
    time = FloatField(caption=u"Время", doc=u"Время срабатывания таймера")
    name = StringField(caption=u"Название", doc=u"Имя таймера для идентификации")
    uid  = UUIDField(caption=u"UID", doc=u"Уникальный идентификатор таймера")


class OnTimer(QuestEvent):
    def __init__(self, name=None, uid=None, **kw):
        super(OnTimer, self).__init__(**kw)
        self.name = name
        self.uid = uid
        # todo: ##OPTIMIZE periodical persistent timers support

    def post(self):
        name = self.name
        qtimer = QuestTimer(time=self.time, name=name, uid=self.uid)
        # self.qtimer = qtimer
        self.quest.timers[name] = qtimer
        return super(OnTimer, self).post()

    def on_cancel(self, time=None):
        self.quest.timers.pop(self.name, None)
        super(OnTimer, self).on_cancel(time=time)

    def on_perform(self):
        self.quest.timers.pop(self.name, None)
        super(OnTimer, self).on_perform()


class OnNote(QuestEvent):
    def __init__(self, note_uid, result=None, **kw):
        super(OnNote, self).__init__(**kw)
        self.note_uid = note_uid
        self.result = result


class OnQuestChange(QuestEvent):
    def __init__(self, target_quest_uid, **kw):
        super(OnQuestChange, self).__init__(**kw)
        self.target_quest_uid = target_quest_uid


class OnCancel(QuestEvent): pass


class OnDie(QuestEvent): pass


class OnMakeDmg(QuestEvent):
    def __init__(self, targets, **kw):
        super(OnMakeDmg, self).__init__(**kw)
        self.targets = targets


class OnGetDmg(QuestEvent):
    def __init__(self, obj, **kw):
        super(OnGetDmg, self).__init__(**kw)
        self.obj = obj


class OnQuestSee(QuestEvent):
    def __init__(self, obj, **kw):
        super(OnQuestSee, self).__init__(**kw)
        self.obj = obj


class OnQuestOut(QuestEvent):
    def __init__(self, obj, **kw):
        super(OnQuestOut, self).__init__(**kw)
        self.obj = obj


class OnAppendCar(QuestEvent): pass


class OnEnterToLocation(QuestEvent):
    def __init__(self, location, **kw):
        super(OnEnterToLocation, self).__init__(**kw)
        self.location = location


class OnExitFromLocation(OnEnterToLocation): pass


class OnChangeInventory(QuestEvent):
    def __init__(self, diff_inventories, **kw):
        super(OnChangeInventory, self).__init__(**kw)
        self.diff_inventories = diff_inventories


class OnActivateItem(QuestEvent):
    def __init__(self, item_example, **kw):
        super(OnActivateItem, self).__init__(**kw)
        self.item_example = item_example


class NPCEvent(QuestEvent): pass
class OnEnterNPC(NPCEvent): pass
class OnExitNPC(NPCEvent): pass

class OnBuyCar(NPCEvent): pass
class OnGasStationFuel(NPCEvent): pass
class OnTraderTransaction(NPCEvent): pass
class OnArmorerTransaction(NPCEvent): pass
class OnRPGSetTransaction(NPCEvent): pass


class OnKill(QuestEvent):
    def __init__(self, unit, agent, **kw):
        """
        :param unit: killed Unit example object
        :param agent: killed agent example object
        :param kw: super params
        """
        super(OnKill, self).__init__(**kw)
        self.unit = unit  # todo: weakref?
        self.agent = agent  # todo: weakref?


class OnBarterSuccess(QuestEvent):
    def __init__(self, barter, **kw):
        super(OnBarterSuccess, self).__init__(**kw)
        self.barter = barter


class OnPartyExp(QuestEvent):
    def __init__(self, exp, agents, party, **kw):
        super(OnPartyExp, self).__init__(**kw)
        self.agents = agents
        self.exp = exp
        self.party = party


class OnPartyInclude(QuestEvent):
    def __init__(self, agent, **kw):
        server = kw.pop('server', None) or agent.server
        super(OnPartyInclude, self).__init__(server=server, **kw)
        self.agent = agent


class OnPartyExclude(OnPartyInclude): pass


# todo: Сделать регистрацию квестовых событий через метакласс
ALL = {name: value for name, value in locals().items() if isinstance(value, type) and issubclass(value, QuestEvent)}
