# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import MapWeaponMineItem, MapWeaponRocketItem, MapWeaponTurretItem


class MapWeaponMineItemQuick(MapWeaponMineItem):
    def can_activate(self, time, agent_model=None):
        return agent_model is not None and agent_model.car is not None


class MapWeaponRocketItemQuick(MapWeaponRocketItem):
    pass


class MapWeaponTurretItemQuick(MapWeaponTurretItem):
    def can_activate(self, time, agent_model=None):
        return agent_model is not None and agent_model.car is not None
