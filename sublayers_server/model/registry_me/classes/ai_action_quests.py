# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.quests import Quest
from sublayers_server.model.registry_me.tree import EmbeddedDocumentField, ListField, RegistryLinkField


class AIActionQuest(Quest):
    def use_heal(self, time):
        agent_model = self.agent and self.agent.profile._agent_model
        if not agent_model:
            return
        car = agent_model.car
        if not car:
            return
        inventory = car.inventory
        if not inventory:
            return
        from sublayers_server.model.events import ItemPreActivationEvent
        # Найти любую аптечку в инвентаре и использовать её
        position = None
        for item_rec in inventory.get_all_items():
            if item_rec["item"].example.is_ancestor(agent_model.server.reg.get('/registry/items/usable/build_set')):
                position = item_rec["position"]
        if position:
            ItemPreActivationEvent(agent=agent_model, owner_id=car.uid, position=position, target_id=car.uid, time=time).post()

    def is_target(self, target):
        agent_model = self.agent and self.agent.profile._agent_model
        if agent_model:
            return target.uid in agent_model.target_uid_list
        return False


class AIActionTrafficQuest(AIActionQuest):
    route = EmbeddedDocumentField(
        document_type='sublayers_server.model.registry_me.classes.routes.Route',
        caption=u"Маршрут квеста (Устанавливается квестом-событием)",
        reinst=True,
    )

    towns_protect = ListField(
        root_default=list,
        caption=u"Список городов покровителей (Устанавливается квестом-событием)",
        reinst=True,
        field=RegistryLinkField(
            document_type='sublayers_server.model.registry_me.classes.poi.Town',
        ),
    )

    def get_max_cc(self):
        agent_model = self.agent and self.agent.profile._agent_model
        if agent_model:
            return 1.0 if agent_model.target_uid_list else 0.5
        return 1.0

    def discharge_shoot_command(self, event):
        agent_model = self.agent.profile._agent_model
        car = agent_model.car if agent_model else None
        if not car:
            return
        for sector in car.fire_sectors:
            if sector.is_discharge():
                for target_uid in agent_model.target_uid_list:
                    target = event.server.objects.get(target_uid, None)
                    if target and sector._test_target_in_sector(target=target, time=event.time):
                        car.fire_discharge(side=sector.side, time=event.time)

    def towns_aggro(self, event):
        agent = getattr(event, 'obj', None) and event.obj.main_agent
        if not agent:
            return
        from sublayers_server.model.map_location import Town
        for town in Town.get_towns():
            if town.example in self.towns_protect:
                town.on_enemy_candidate(agent=agent, damage=True, time=event.time)