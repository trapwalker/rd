# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.odm.fields import StringField, IntField, UniReferenceField, ListField


class RoleClass(Root):
    icon = StringField(caption=u'Пиктограмма класса', tags='client')  # todo: use specific field type
    emblem = StringField(caption=u'Эмблема класса', tags='client')
    description = StringField(caption=u'Расширенное описание класса', tags='client')
    console_description = StringField(caption=u'Расширенное описание класса', tags='client')

    class_skills = ListField(
        caption=u"Список классовых навыков",
        base_field=UniReferenceField(
            reference_document_type='sublayers_server.model.registry.classes.skills.ClassSkill',
        ),
    )
    money = IntField(caption=u'Стартовое количество денег', tags='client')
    start_car = UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.mobiles.Car',
        caption=u'Стартовая машинка для данного класса', tags="client",
    )
    start_perks = ListField(
        caption=u"Список доступных стартовых перков",
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.perks.Perk'),
    )
    start_free_point_perks  = IntField(caption=u'Стартовые очки перков', tags='client')
    start_free_point_skills = IntField(caption=u'Стартовые очки навыков', tags='client')
