# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.odm_position import PositionField
from sublayers_server.model.registry.odm.fields import (
    FloatField, StringField, ListField, UniReferenceField, EmbeddedDocumentField,
)


class Agent(Root):
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
    balance = FloatField(default=1000, caption=u"Количество литров на счете агента", tags='client')  # todo: обсудить

    last_town = UniReferenceField(caption=u"Последний посещенный город")
    current_location = UniReferenceField(caption=u"Текущая локация")

    # todo: party link
    # todo: invites list
    # todo: chats list?

    # Механизм перков
    perks = ListField(
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.perks.Perk'),
        caption=u'Список прокачанных перков',
    )

    # Механизм скилов
    exp_table = UniReferenceField(default='reg://registry/rpg_settings/exptable', caption=u"Таблица опыта")
    role_class = UniReferenceField(caption=u"Ролевой класс")

    buy_driving = UniReferenceField(
        default='reg://registry/rpg_settings/buy_skill',
        caption=u"Купленные очки навыка вождения",
        reference_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_shooting = UniReferenceField(
        default='reg://registry/rpg_settings/buy_skill',
        caption=u"Купленные очки навыка стрельбы",
        reference_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_masking = UniReferenceField(
        default='reg://registry/rpg_settings/buy_skill',
        caption=u"Купленные очки навыка маскировки",
        reference_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_leading = UniReferenceField(
        default='reg://registry/rpg_settings/buy_skill',
        caption=u"Купленные очки навыка лидерства",
        reference_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_trading = UniReferenceField(
        default='reg://registry/rpg_settings/buy_skill',
        caption=u"Купленные очки навыка торговли",
        reference_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )
    buy_engineering = UniReferenceField(
        default='reg://registry/rpg_settings/buy_skill',
        caption=u"Купленные очки навыка инженеринга",
        reference_document_type='sublayers_server.model.registry.classes.skills.BuySkill',
    )

    driving = UniReferenceField(default='reg://registry/rpg_settings/skill', caption=u"Навык вождения", tags='skill')
    shooting = UniReferenceField(default='reg://registry/rpg_settings/skill', caption=u"Навык стрельбы", tags='skill')
    masking = UniReferenceField(default='reg://registry/rpg_settings/skill', caption=u"Навык маскировки", tags='skill')
    leading = UniReferenceField(default='reg://registry/rpg_settings/skill', caption=u"Навык лидерства", tags='skill')
    trading = UniReferenceField(default='reg://registry/rpg_settings/skill', caption=u"Навык торговли", tags='skill')
    engineering = UniReferenceField(default='reg://registry/rpg_settings/skill', caption=u"Навык инженеринга", tags='skill')

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
