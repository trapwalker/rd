# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.odm.fields import (
    StringField, ListField, BooleanField, UUIDField,
    UniReferenceField,
)


class Agent(Root):
    login = StringField(caption=u'Уникальное имя пользователя', tags='client', sparse=True)
    about_self = StringField(default=u'', caption=u'О себе', tags='client')

    car = UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.mobiles.Car',
        caption=u"Активный автомобиль",
    )  # todo: test to prefix path like: /mobile/cars/*
    car_list = ListField(
        base_field='sublayers_server.model.registry.classes.mobiles.Car',
        default=[], caption=u"Список всех машин, кроме активной",
    )

    position = Position(caption=u"Последние координаты агента")
    balance = FloatAttribute(default=1000, caption=u"Количество литров на счете агента", tags='client')  # todo: обсудить

    last_town = RegistryLink(caption=u"Последний посещенный город")
    current_location = RegistryLink(caption=u"Текущая локация")

    # todo: current location link

    # todo: party link
    # todo: invites list
    # todo: chats list?

    # Механизм перков
    perks = InventoryPerksAttribute(caption=u'Список прокачанных перков')

    # Механизм скилов
    exp_table = RegistryLink(default='reg://registry/rpg_settings/exptable', caption=u"Таблица опыта")
    role_class = RegistryLink(caption=u"Ролевой класс")

    buy_driving = RegistryLink(default='reg://registry/rpg_settings/buy_skill',
                               caption=u"Купленные очки навыка вождения")
    buy_shooting = RegistryLink(default='reg://registry/rpg_settings/buy_skill',
                                caption=u"Купленные очки навыка стрельбы")
    buy_masking = RegistryLink(default='reg://registry/rpg_settings/buy_skill',
                               caption=u"Купленные очки навыка маскировки")
    buy_leading = RegistryLink(default='reg://registry/rpg_settings/buy_skill',
                               caption=u"Купленные очки навыка лидерства")
    buy_trading = RegistryLink(default='reg://registry/rpg_settings/buy_skill',
                               caption=u"Купленные очки навыка торговли")
    buy_engineering = RegistryLink(default='reg://registry/rpg_settings/buy_skill',
                                   caption=u"Купленные очки навыка инженеринга")

    driving = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык вождения", tags='skill')
    shooting = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык стрельбы", tags='skill')
    masking = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык маскировки", tags='skill')
    leading = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык лидерства", tags='skill')
    trading = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык торговли", tags='skill')
    engineering = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык инженеринга", tags='skill')

    def iter_skills(self):  # todo: need review
        for name, attr, getter in self.iter_attrs(tags='skill'):
            yield name, getter().calc_value()

    def iter_perks(self):  # todo: need review
        for perk in self.perks:
            yield perk
            
    def skill_point_summ(self):
        return self.driving.value + self.shooting.value + self.masking.value + self.leading.value + self.trading.value + self.engineering.value

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