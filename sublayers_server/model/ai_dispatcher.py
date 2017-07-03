# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.agents import AI
from sublayers_server.model.events import event_deco


class AIDispatcher(AI):
    def __init__(self, time, quest_example, **kw):
        super(AIDispatcher, self).__init__(time=time, **kw)
        self.create_ai_quest(time=time, quest_example=quest_example)

    @event_deco
    def create_ai_quest(self, event, quest_example):
        new_quest = quest_example.instantiate(abstract=False, hirer=None)
        if new_quest.generate(event=event, agent=self.example):
            self.example.profile.add_quest(quest=new_quest, time=event.time)
            self.example.profile.start_quest(new_quest.uid, time=event.time, server=self.server)
        else:
            log.debug('AIDispatcher not started!!!')
            del new_quest