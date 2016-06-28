# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import ArmorerItem
from sublayers_server.model.registry.odm.fields import UniReferenceField, StringField, FloatField


class Weapon(ArmorerItem):
    ammo = UniReferenceField(caption=u'Боеприпас', need_to_instantiate=False)  # todo: store set of ammo types
    direction = StringField(caption=u'Направление (FBRL)', tags='client')
    ammo_per_shot = FloatField(default=0, caption=u'Расход патронов за выстрел (< 0)')
    ammo_per_second = FloatField(default=0, caption=u'Расход патронов в секунду')
    radius = FloatField(caption=u'Дальность стрельбы (м)')
    width = FloatField(caption=u'Ширина сектора стрельбы (град)')


class Cannon(Weapon):
    is_auto = False
    dmg = FloatField(caption=u'Урон за выстрел')
    area_dmg = FloatField(caption=u'Урон за выстрел', default=10)
    time_recharge = FloatField(caption=u'Время перезарядки (с)')


class MachineGun(Weapon):
    is_auto = True
    dps = FloatField(caption=u'Урон в секунду')
