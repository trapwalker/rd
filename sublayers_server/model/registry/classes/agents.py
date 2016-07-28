# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Root
from sublayers_server.model.registry.odm_position import PositionField
from sublayers_server.model.registry.odm.fields import (
    FloatField, StringField, ListField, UniReferenceField, EmbeddedDocumentField,
)


class Agent(Root):
    profile_id = StringField(caption=u'Идентификатор профиля владельца', sparse=True, identify=True)
    login = StringField(caption=u'Уникальное имя пользователя', tags='client', sparse=True)
    about_self = StringField(default=u'', caption=u'О себе', tags='client')

    car = UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.mobiles.Car',
        caption=u"Активный автомобиль",
    )  # todo: test to prefix path like: /mobile/cars/*
    car_list = ListField(
        base_field=EmbeddedDocumentField(embedded_document_type='sublayers_server.model.registry.classes.mobiles.Car'),
        default=list, caption=u"Список всех машин, кроме активной",
    )

    position = PositionField(caption=u"Последние координаты агента")
    balance = FloatField(caption=u"Количество литров на счете агента", tags='client')  # todo: обсудить #release

    last_town = UniReferenceField(
        caption=u"Последний посещенный город",
        reference_document_type='sublayers_server.model.registry.classes.poi.Town',
    )
    current_location = UniReferenceField(
        caption=u"Текущая локация",
        reference_document_type='sublayers_server.model.registry.classes.poi.Town',
    )
    # todo: party link
    # todo: invites list
    # todo: chats list?

    # Механизм перков
    perks = ListField(
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.perks.Perk'),
        caption=u'Список прокачанных перков',
    )

    # Механизм скилов
    exp_table = UniReferenceField(
        caption=u"Таблица опыта",
        default='reg:///registry/rpg_settings/exptable',
        reference_document_type='sublayers_server.model.registry.classes.exptable.ExpTable',
    )
    role_class = UniReferenceField(  # todo: Проверить нужно ли декларировать default
        caption=u"Ролевой класс",
        reference_document_type='sublayers_server.model.registry.classes.role_class.RoleClass',
    )

    # todo: Избавиться от пакета покупных скиллов.
    # Инфу этих документов нужно разместить в обычных скиллах.
    buy_driving = EmbeddedDocumentField(
        caption=u"Купленные очки навыка вождения",
        default='reg:///registry/rpg_settings/buy_skill/driving',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_shooting = EmbeddedDocumentField(
        caption=u"Купленные очки навыка стрельбы",
        default='reg:///registry/rpg_settings/buy_skill/shooting',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_masking = EmbeddedDocumentField(
        caption=u"Купленные очки навыка маскировки",
        default='reg:///registry/rpg_settings/buy_skill/masking',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_leading = EmbeddedDocumentField(
        caption=u"Купленные очки навыка лидерства",
        default='reg:///registry/rpg_settings/buy_skill/leading',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_trading = EmbeddedDocumentField(
        caption=u"Купленные очки навыка торговли",
        default='reg:///registry/rpg_settings/buy_skill/trading',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_engineering = EmbeddedDocumentField(
        caption=u"Купленные очки навыка инженеринга",
        default='reg:///registry/rpg_settings/buy_skill/engineering',
        embedded_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )

    driving = EmbeddedDocumentField(
        caption=u"Навык вождения", tags='skill',
        default='reg:///registry/rpg_settings/skill/driving',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
    )
    shooting = EmbeddedDocumentField(
        caption=u"Навык стрельбы", tags='skill',
        default='reg:///registry/rpg_settings/skill/shooting',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
    )
    masking = EmbeddedDocumentField(
        caption=u"Навык маскировки", tags='skill',
        default='reg:///registry/rpg_settings/skill/masking',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
    )
    leading = EmbeddedDocumentField(
        caption=u"Навык лидерства", tags='skill',
        default='reg:///registry/rpg_settings/skill/leading',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
    )
    trading = EmbeddedDocumentField(
        caption=u"Навык торговли", tags='skill',
        default='reg:///registry/rpg_settings/skill/trading',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
    )
    engineering = EmbeddedDocumentField(
        caption=u"Навык инженеринга", tags='skill',
        default='reg:///registry/rpg_settings/skill/engineering',
        embedded_document_type='sublayers_server.model.registry.classes.skills.Skill',
    )

    def iter_skills(self):  # todo: need review
        for name, attr, getter in self.iter_attrs(tags='skill'):
            yield name, getter().calc_value()

    def iter_perks(self):  # todo: need review
        for perk in self.perks:
            yield perk
            
    def skill_point_summ(self):
        return (
            self.driving.value +
            self.shooting.value +
            self.masking.value +
            self.leading.value +
            self.trading.value +
            self.engineering.value
        )

    def as_client_dict(self):
        d = super(Agent, self).as_client_dict()
        for name, calc_value in self.iter_skills():
            d[name] = calc_value
        d['role_class'] = '' if self.role_class is None else self.role_class.description
        # todo: список перков
        # todo: машинка
        return d

    def get_car_list_by_npc(self, npc):
        # todo: this method need to testing !
        # type of npc = Institution
        res = []
        # todo: refactor to id
        for car in self.car_list:
            if car.last_parking_npc.node_hash() == npc.node_hash():
                res.append(car)
        return res
