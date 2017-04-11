# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.item import ArmorerItem, Item
from sublayers_server.model.registry_me.tree import RegistryLinkField, EmbeddedNodeField

from mongoengine import StringField, FloatField, ListField


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


class MachineGun(Weapon):
    is_auto = True
    dps = FloatField(caption=u'Урон в секунду')
    animation_tracer_rate = FloatField(caption=u'Количество трассеров отрисовываемых в секунду')
