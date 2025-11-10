# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import (
    Node, 
    StringField, IntField, ListField,
    RegistryLinkField,
    LocalizedStringField,
)


class RoleClass(Node):
    icon = StringField(caption='Пиктограмма класса', tags={'client'})  # todo: use specific field type
    emblem = StringField(caption='Эмблема класса', tags={'client'})
    description = LocalizedStringField(caption='Расширенное описание класса', tags={'client'})
    description_char_window = LocalizedStringField(caption='Расширенное описание класса для окна персонажа')
    console_description = LocalizedStringField(caption='Расширенное описание класса', tags={'client'})

    class_skills = ListField(
        caption="Список классовых навыков",
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.skills.ClassSkill'),
    )
    money = IntField(caption='Стартовое количество денег', tags={'client'})
    start_car = RegistryLinkField(
        document_type='sublayers_server.model.registry_me.classes.mobiles.Car',
        caption='Стартовая машинка для данного класса', tags={'client'},
    )
    start_perks = ListField(
        caption="Список доступных стартовых перков",
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.perks.Perk'),
    )
    start_free_point_perks = IntField(caption='Стартовые очки перков', tags={'client'})
    start_free_point_skills = IntField(caption='Стартовые очки навыков', tags={'client'})
