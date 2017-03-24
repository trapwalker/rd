# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import Node, Subdoc, RegistryLinkField

from mongoengine import StringField, IntField, FloatField, ListField, EmbeddedDocumentField
import math


class ClassSkill(Node):
    target = StringField(caption=u"Целевой навык", tags={'client'})
    bonus_step = IntField(caption=u"Шаг начисления бонуса", tags={'client'})
    limit = IntField(caption=u"Предел роста навыка", tags={'client'})


class Skill(Node):
    value = IntField(caption=u"Уровень навыка", tags={'client'})
    limit = IntField(caption=u"Предел прокачки навыка", tags={'client'})
    mod = RegistryLinkField(caption=u"Модификатор навыка", document_type=ClassSkill)
    description = StringField(caption=u'Расширенное описание', tags={'client'})

    def get_bonuses(self, v):
        if v >= self.mod.bonus_step:
            return v + self.get_bonuses(int(math.floor(v / self.mod.bonus_step)))
        return v

    def calc_value(self, value=-1):
        # limit = self.mod.limit if self.mod.limit > 0 else self.limit

        if value < 0:
            value = self.value
        if self.mod.bonus_step > 0:
            return value + int(math.floor(self.value / self.mod.bonus_step))  # Классический рассчёт
            # return self.value + self.get_bonuses(int(math.floor(self.value / self.mod.bonus_step)))  # Расчёт бонусов на бонусы
        else:
            return value

    def as_client_dict(self):
        d = super(Skill, self).as_client_dict()
        d.update(mod=self.mod.as_client_dict())
        return d


class SkillPriceItem(Subdoc):
    count = IntField(caption=u"Количество", tags={'client'})
    price = FloatField(caption=u"Цена", tags={'client'})


class BuySkill(Node):
    value = IntField(caption=u"Количество купленных очков навыка", tags={'client'})
    limit = IntField(caption=u"Предел покупки очков навыка", tags={'client'})
    description = StringField(caption=u"Расширенное описание", tags={'client'})
    price = ListField(
        caption=u'Таблица цен на очки навыков', tags={'client'},
        field=EmbeddedDocumentField(document_type=SkillPriceItem),
    )
