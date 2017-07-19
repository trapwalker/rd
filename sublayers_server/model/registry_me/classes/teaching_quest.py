# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.quests import Quest
from sublayers_server.model.registry_me.tree import EmbeddedNodeField
from sublayers_server.model.messages import UserExampleCarInfo

from sublayers_world.registry.quests.delivery_quest import DeliveryQuest

class TeachingQuest(Quest):
    teaching_delivery_quest = EmbeddedNodeField(document_type=DeliveryQuest)

    def car_set_fuel(self, event):
        self.agent.profile.car.fuel = self.agent.profile.car.max_fuel / 2.
        if self.agent.profile._agent_model:
            UserExampleCarInfo(agent=self.agent.profile._agent_model, time=event.time).post()


class TeachingMapQuest(Quest):
    pass