# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import math

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.attr import TextAttribute, IntAttribute


class ClassSkill(Root):
    target = TextAttribute(default='', caption=u"Целевой навык", tags='client')
    bonus_step = IntAttribute(default=0, caption=u"Шаг начисления бонуса", tags='client')
    limit = IntAttribute(default=0, caption=u"Предел роста навыка", tags='client')


class Skill(Root):
    value = IntAttribute(default=0, caption=u"Уровень навыка вождения", tags='client')
    limit = IntAttribute(default=100, caption=u"Предел прокачки навыка", tags='client')
    mod = RegistryLink(default='reg://registry/rpg_settings/class_skill/empty_0', caption=u"Модификатор навыка", tags='client')

    def calc_value(self):
        # limit = self.mod.limit if self.mod.limit > 0 else self.limit
        if self.mod.bonus_step > 0:
            return self.value + math.floor(self.value / self.mod.bonus_step)
        else:
            return self.value