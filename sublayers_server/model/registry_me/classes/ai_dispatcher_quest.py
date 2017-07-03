# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.quests import Quest
from sublayers_server.model.registry_me.tree import IntField, ListField, EmbeddedNodeField

class AIDispatcherQuest(Quest):
    refresh_time = IntField(caption=u'Интервал обновления квестов')
    quests = ListField(
        caption=u"Генераторы квестов",
        reinst=True,
        field=EmbeddedNodeField(
            document_type='sublayers_server.model.registry_me.classes.quests.Quest',
            reinst=True,
        ),
    )
