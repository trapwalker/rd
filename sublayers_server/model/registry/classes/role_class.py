# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute, FloatAttribute, TextAttribute, IntAttribute
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.attr.inv import InventoryPerksAttribute


class RoleClass(Root):
    title = TextAttribute(caption=u'Название класса', tags='client')
    icon = Attribute(caption=u'Пиктограмма класса', tags='client')
    emblem = Attribute(caption=u'Эмблема класса', tags='client')
    description = TextAttribute(caption=u'Расширенное описание класса', tags='client')
    console_description = TextAttribute(caption=u'Расширенное описание класса', tags='client')

    class_skills = Attribute(caption=u"Список классовых навыков", tags='client')
    money = IntAttribute(caption=u'Стартовое количество денег', tags='client')
    start_car = RegistryLink(default=None, caption=u'Стартовая машинка для данного класса', tags="client")
    start_perks = InventoryPerksAttribute(caption=u'Список доступных стартовых перков')

    start_free_point_perks = IntAttribute(default=0, caption=u'Стартовые очки перков', tags='client')
    start_free_point_skills = IntAttribute(default=0, caption=u'Стартовые очки навыков', tags='client')
