# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import (
    Node, Subdoc, EmbeddedDocumentField,
    StringField, ListField, IntField,
    EmbeddedNodeField, RegistryLinkField, PositionField,
)


class RandomizeCarParamsByLvl(Subdoc):
    level = IntField()
    cars = ListField(
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.mobiles.Car'),
    )
    weapons = ListField(
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.weapons.Weapon'),
    )
    tuner_items = ListField(
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.item.TunerItem'),
    )


class WorldSettings(Node):
    avatar_list = ListField(field=StringField())
    role_class_order = ListField(
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.role_class.RoleClass'),
    )
    quick_game_cars = ListField(
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.mobiles.Car'),
    )
    quick_game_bot_count = IntField(caption=u"Количество ботов в быстрой игре")
    quick_game_start_pos = PositionField(caption=u"Центр быстрой игры")
    quick_game_play_radius = IntField(caption=u"Радиус быстрой игры")
    quick_game_respawn_bots_pos = PositionField(caption=u"Центр респа игроков")
    quick_game_respawn_bots_radius = IntField(caption=u"Радиус респа игроков")

    quick_game_bot_cars = ListField(
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.mobiles.Car'),
    )
    quick_game_bot_agents = ListField(
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.agents.AIQuickAgentProfile'),
    )
    quick_game_bots_nick = ListField(field=StringField())



    # Настройки рандомизации по-умолчанию
    randomize_cars_by_lvl = ListField(field=EmbeddedDocumentField(document_type=RandomizeCarParamsByLvl))
