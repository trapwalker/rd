# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging

log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import Node, EmbeddedNodeField

from mongoengine import StringField, ListField, IntField


class WorldSettings(Node):
    avatar_list = ListField(field=StringField())
    role_class_order = ListField(
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.role_class.RoleClass'),
    )
    quick_game_cars = ListField(
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.mobiles.Car'),
    )
    quick_game_bot_count = IntField(caption=u"Количество ботов в быстрой игре")
    quick_game_bot_cars = ListField(
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.mobiles.Car'),
    )
    quick_game_bot_agents = ListField(
        field=EmbeddedNodeField(document_type='sublayers_server.model.registry_me.classes.agents.AIQuickAgent'),
    )
