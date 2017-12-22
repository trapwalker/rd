# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.quests import Quest
from sublayers_server.model.registry_me.tree import IntField, ListField, EmbeddedNodeField

class AIDispatcherQuest(Quest):
    refresh_time = IntField(caption=u'Интервал обновления квестов')
    quests = ListField(
        caption=u"Генераторы квестов",
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.quests.Quest',
        ),
    )

    def refresh(self, event):
        return
        for quest_proto in self.quests:
            if quest_proto.can_instantiate(event=event, agent=self.agent):
                quest = quest_proto.instantiate(abstract=False, hirer=None)
                # todo: Костыль!!! Исправить в будущем!!! Так как у нового квеста не было тегов
                quest.tags = quest_proto.tags[:]
                if quest.generate(event=event, agent=self.agent):
                    self.agent.profile.add_quest(quest=quest, time=event.time)
                    self.agent.profile.start_quest(quest.uid, time=event.time, server=event.server)
                else:
                    log.debug('Quest dont generate: {!r}'.format(quest))
                    del quest
