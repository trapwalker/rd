# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.classes.weapons import Weapon  # todo: осторожно с рекуррентным импортом
from sublayers_server.model.registry.classes.item import SlotLock, MechanicItem  # tpodo: перенести к описанию слота
from sublayers_server.model.registry.classes.inventory import InventoryField
from sublayers_server.model.registry.odm_position import PositionField
from sublayers_server.model.registry.odm.fields import (
    StringField, UniReferenceField, ListField, IntField,
)


class WorldSettings(Root):
    avatar_list = ListField(base_field=StringField())
    role_class_order = ListField(base_field=UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.role_class.RoleClass'
    ))
    quick_game_cars = ListField(
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.mobiles.Car'))

    quick_game_bot_count = IntField(caption=u"Количество ботов в быстрой игре")
    quick_game_start_pos = PositionField(caption=u"Центр быстрой игры")
    quick_game_play_radius = IntField(caption=u"Радиус быстрой игры")
    quick_game_respawn_bots_pos = PositionField(caption=u"Центр респа игроков")
    quick_game_respawn_bots_radius = IntField(caption=u"Радиус респа игроков")

    quick_game_bot_cars = ListField(
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.mobiles.Car'))
    quick_game_bot_agents = ListField(
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.agents.AIQuickAgent'))
    quick_game_bots_nick = ListField(base_field=StringField())
