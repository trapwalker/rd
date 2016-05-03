# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.attr import Attribute, FloatAttribute, TextAttribute, IntAttribute


class Skill(Root):
    value = IntAttribute(default=0, caption=u"Необходимый уровень навыка вождения", tags='client')
    limit = IntAttribute(default=0, caption=u"Предел навыка вождения навыка вождения", tags='client')
    mod = RegistryLink(default='reg://registry/rpg_settings//class_skill//empty_0', caption=u"Модификатор навыка")


