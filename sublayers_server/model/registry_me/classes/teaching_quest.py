# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.quests import Quest, DeliveryQuest
from sublayers_server.model.registry_me.tree import EmbeddedNodeField
from sublayers_server.model.messages import UserExampleSelfShortMessage


class TeachingQuest(Quest):
    teaching_delivery_quest = EmbeddedNodeField(document_type=DeliveryQuest, reinst=True)

    def car_set_fuel(self, event):
        self.agent.profile.car.fuel = self.agent.profile.car.max_fuel / 2.
        if self.agent.profile._agent_model:
            UserExampleSelfShortMessage(agent=self.agent.profile._agent_model, time=event.time).post()


class TeachingMapQuest(Quest):
    pass