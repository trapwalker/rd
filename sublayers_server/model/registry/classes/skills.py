# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import math

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.odm.doc import AbstractDocument
from sublayers_server.model.registry.odm.fields import (
    UniReferenceField, StringField, IntField, FloatField, ListField, EmbeddedDocumentField,
)


class ClassSkill(Root):
    target = StringField(default='', caption=u"Целевой навык", tags='client')
    bonus_step = IntField(default=0, caption=u"Шаг начисления бонуса", tags='client')
    limit = IntField(default=0, caption=u"Предел роста навыка", tags='client')


class Skill(Root):
    value = IntField(default=0, caption=u"Уровень навыка", tags='client')
    limit = IntField(default=100, caption=u"Предел прокачки навыка", tags='client')
    mod = UniReferenceField(
        caption=u"Модификатор навыка",
        default='reg://registry/rpg_settings/class_skill/empty_0', 
        reference_document_type=ClassSkill,
    )
    description = StringField(
        default=u'Игрвой навык персонажа',
        caption=u'Расширенное описание',
        tags='client',
    )

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


class SkillPriceItem(AbstractDocument):
    count = IntField(caption=u"Количество")
    price = FloatField(caption=u"Цена")


class BuySkill(Root):
    value = IntField(default=0, caption=u"Количество купленных очков навыка", tags='client')
    limit = IntField(default=3, caption=u"Предел покупки очков навыка", tags='client')
    description = StringField(default=u"Дополнительное очко навыка", caption=u"Расширенное описание", tags='client')
    price = ListField(
        caption=u'Таблица цен на очки навыков', tags='client',
        base_field=EmbeddedDocumentField(embedded_document_type=SkillPriceItem),
    )
