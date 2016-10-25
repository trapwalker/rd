﻿# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event


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


class OnNote(QuestEvent): pass
class OnEnterNPC(QuestEvent): pass
class OnExitNPC(QuestEvent): pass
class OnDie(QuestEvent): pass

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


# todo: Сделать регистрацию квестовых событий через метакласс
ALL = {name: value for name, value in locals().items() if isinstance(value, type) and issubclass(value, QuestEvent)}
