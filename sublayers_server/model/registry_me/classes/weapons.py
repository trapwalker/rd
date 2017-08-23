# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.item import ArmorerItem, Item
from sublayers_server.model.registry_me.tree import (
    StringField, FloatField, ListField,
    RegistryLinkField, EmbeddedNodeField,
)


class RocketLauncher(ArmorerItem):
    pass


class Weapon(ArmorerItem):
    ammo = RegistryLinkField(caption=u'Боеприпас', document_type=Item,)  # todo: store set of ammo types
    direction = StringField(caption=u'Направление (FBRL)', tags={'client'})
    ammo_per_shot = FloatField(caption=u'Расход патронов за выстрел (< 0)')
    ammo_per_second = FloatField(caption=u'Расход патронов в секунду')
    radius = FloatField(caption=u'Дальность стрельбы (м)')
    width = FloatField(caption=u'Ширина сектора стрельбы (град)')
    power_penetration = FloatField(caption=u'Мощность оружия (пробитие)')
    weapon_audio = ListField(caption=u'Имена звуков стрельбы', field=StringField(), tags={'client'})
    weapon_animation = ListField(caption=u'Типы анимаций', field=StringField(), tags={'client'})


class Cannon(Weapon):
    is_auto = False
    dmg = FloatField(caption=u'Урон за выстрел')
    area_dmg = FloatField(caption=u'Урон за выстрел')
    time_recharge = FloatField(caption=u'Время перезарядки (с)')

    def html_description(self):
        weight = u'Не указан'
        if self.weight_class == 1: weight = u'Легкий'
        elif self.weight_class == 2: weight = u'Средний'
        elif self.weight_class == 3: weight = u'Тяжелый'
        return (u'<div class="description-line left-align small">Класс:</div><div class="description-line right-align small">{}</div>'.format(weight) +
                u'<div class="description-line left-align">Урон:</div><div class="description-line right-align">{}</div>'.format(self.dmg) +
                u'<div class="description-line left-align">Перезараядка:</div><div class="description-line right-align">{} с</div>'.format(self.time_recharge) +
                u'<div class="description-line left-align small">Дальность:</div><div class="description-line right-align small">{} м</div>'.format(int(self.radius)) +
                u'<div class="description-line left-align small">Сектор:</div><div class="description-line right-align small">{}°</div>'.format(int(self.width)) +
                u'<div class="description-line left-align">Пробитие:</div><div class="description-line right-align">{}</div>'.format(int(self.power_penetration)) +
                u'<div class="description-line left-align small">Снаряд:</div><div class="description-line right-align small">{}</div>'.format(self.ammo.doc)
                )


class MachineGun(Weapon):
    is_auto = True
    dps = FloatField(caption=u'Урон в секунду')
    animation_tracer_rate = FloatField(caption=u'Количество трассеров отрисовываемых в секунду')

    def html_description(self):
        weight = u'Не указан'
        if self.weight_class == 1: weight = u'Легкий'
        elif self.weight_class == 2: weight = u'Средний'
        elif self.weight_class == 3: weight = u'Тяжелый'
        return (u'<div class="description-line left-align small">Класс:</div><div class="description-line right-align small">{}</div>'.format(weight) +
                u'<div class="description-line left-align">Урон в секунду:</div><div class="description-line right-align">{}</div>'.format(self.dps) +
                u'<div class="description-line left-align small">Дальность:</div><div class="description-line right-align small">{} м</div>'.format(int(self.radius)) +
                u'<div class="description-line left-align small">Сектор:</div><div class="description-line right-align small">{}°</div>'.format(int(self.width)) +
                u'<div class="description-line left-align">Пробитие:</div><div class="description-line right-align">{}</div>'.format(int(self.power_penetration)) +
                u'<div class="description-line left-align small">Снаряд:</div><div class="description-line right-align small">{}</div>'.format(self.ammo.doc)
                )

