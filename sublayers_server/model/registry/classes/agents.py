# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Position, FloatAttribute, TextAttribute
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.attr.inv import InventoryPerksAttribute
from sublayers_server.model.registry.classes.skills import Skill

from sublayers_server.model.registry.attr.inv import InventoryAttribute

import random


class Agent(Root):
    login = TextAttribute(caption=u'Уникальное имя пользователя', tags='client')
    about_self = TextAttribute(default=u'', caption=u'Уникальное имя пользователя', tags='client')
    # avatar_170_146 = TextAttribute(default=u'', caption=u'Ссылка на аватар разрешения 170x146 px') # todo: не использовать; брать user.avatar_link

    car = RegistryLink(caption=u"Активный автомобиль")  # todo: test to prefix path like: /mobile/cars/*
    car_list = InventoryAttribute(caption=u"Список всех машин, кроме активной")

    position = Position(caption=u"Последние координаты агента")
    balance = FloatAttribute(default=1000, caption=u"Количество литров на счете агента", tags='client')  # todo: обсудить

    last_town = RegistryLink(caption=u"Последний посещенный город")
    current_location = RegistryLink(caption=u"Текущая локация")

    # todo: current car
    # todo: car list
    # todo: current location link

    # todo: party link
    # todo: invites list
    # todo: chats list?

    # Механизм перков
    perks = InventoryPerksAttribute(caption=u'Список прокачанных перков')

    # Механизм скилов
    exp_table = RegistryLink(caption=u"Таблица опыта")
    role_class = RegistryLink(caption=u"Ролевой класс")

    driving = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык вождения", tags='skill')
    shooting = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык стрельбы", tags='skill')
    masking = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык маскировки", tags='skill')
    leading = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык лидерства", tags='skill')
    trading = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык торговли", tags='skill')
    engineering = RegistryLink(default='reg://registry/rpg_settings/skill', caption=u"Навык инженеринга", tags='skill')

    def iter_skills(self):
        for attr, getter in self.iter_attrs(tags='skill'):
            yield attr.name, getter().calc_value()

    def iter_perks(self):
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