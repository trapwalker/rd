# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import ArmorerItem, Item
from sublayers_server.model.registry.odm.fields import UniReferenceField, StringField, FloatField, ListField, \
    EmbeddedDocumentField


class Weapon(ArmorerItem):
    ammo = UniReferenceField(
        caption=u'Боеприпас',
        reference_document_type=Item,
    )  # todo: store set of ammo types
    direction = StringField(caption=u'Направление (FBRL)', tags='client')
    ammo_per_shot = FloatField(caption=u'Расход патронов за выстрел (< 0)')
    ammo_per_second = FloatField(caption=u'Расход патронов в секунду')
    radius = FloatField(caption=u'Дальность стрельбы (м)')
    width = FloatField(caption=u'Ширина сектора стрельбы (град)')
    power_penetration = FloatField(caption=u'Мощность оружия (пробитие)')


class Cannon(Weapon):
    is_auto = False
    dmg = FloatField(caption=u'Урон за выстрел')
    area_dmg = FloatField(caption=u'Урон за выстрел')
    time_recharge = FloatField(caption=u'Время перезарядки (с)')
    weapon_animation = ListField(caption=u'Типы анимаций', base_field=StringField())


class MachineGun(Weapon):
    is_auto = True
    dps = FloatField(caption=u'Урон в секунду')
    animation_tracer_rate = FloatField(caption=u'Количество трассеров отрисовываемых в секунду')
    weapon_animation = ListField(caption=u'Типы анимаций', base_field=StringField())
