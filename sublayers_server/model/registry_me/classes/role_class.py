# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import (
    Node, 
    StringField, IntField, ListField,
    RegistryLinkField,
)


class RoleClass(Node):
    icon = StringField(caption=u'Пиктограмма класса', tags={'client'})  # todo: use specific field type
    emblem = StringField(caption=u'Эмблема класса', tags={'client'})
    description = StringField(caption=u'Расширенное описание класса', tags={'client'})
    description_char_window = StringField(caption=u'Расширенное описание класса для окна персонажа')
    description__en = StringField(caption=u'Расширенное описание класса', tags={'client'})
    description__ru = StringField(caption=u'Расширенное описание класса', tags={'client'})
    console_description = StringField(caption=u'Расширенное описание класса', tags={'client'})
    console_description__en = StringField(caption=u'Расширенное описание класса', tags={'client'})
    console_description__ru = StringField(caption=u'Расширенное описание класса', tags={'client'})

    class_skills = ListField(
        caption=u"Список классовых навыков",
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.skills.ClassSkill'),
    )
    money = IntField(caption=u'Стартовое количество денег', tags={'client'})
    start_car = RegistryLinkField(
        document_type='sublayers_server.model.registry_me.classes.mobiles.Car',
        caption=u'Стартовая машинка для данного класса', tags={'client'},
    )
    start_perks = ListField(
        caption=u"Список доступных стартовых перков",
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.perks.Perk'),
    )
    start_free_point_perks = IntField(caption=u'Стартовые очки перков', tags={'client'})
    start_free_point_skills = IntField(caption=u'Стартовые очки навыков', tags={'client'})
