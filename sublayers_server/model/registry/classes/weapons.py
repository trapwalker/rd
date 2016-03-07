# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.item import ArmorerItem
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.attr import Attribute, FloatAttribute, TextAttribute


class Weapon(ArmorerItem):
    ammo = RegistryLink(caption=u'Боеприпас', need_to_instantiate=False)  # todo: store set of ammo types
    direction = TextAttribute(caption=u'Направление (FBRL)', tags='client')
    ammo_per_shot = FloatAttribute(default=0, caption=u'Расход патронов за выстрел (< 0)')
    ammo_per_second = FloatAttribute(default=0, caption=u'Расход патронов в секунду')
    radius = FloatAttribute(caption=u'Дальность стрельбы (м)')
    width = FloatAttribute(caption=u'Ширина сектора стрельбы (град)')

    armorer_side_F = Attribute(caption=u'Изображение у оружейника (вид сбоку, вперед)', tags='client')
    armorer_side_B = Attribute(caption=u'Изображение у оружейника (вид сбоку, назад)', tags='client')
    armorer_side_R = Attribute(caption=u'Изображение у оружейника (вид сбоку, право)', tags='client')
    armorer_side_L = Attribute(caption=u'Изображение у оружейника (вид сбоку, лево)', tags='client')
    armorer_top_F = Attribute(caption=u'Изображение у оружейника (вид сверху, вперед)', tags='client')
    armorer_top_B = Attribute(caption=u'Изображение у оружейника (вид сверху, назад)', tags='client')
    armorer_top_R = Attribute(caption=u'Изображение у оружейника (вид сверху, право)', tags='client')
    armorer_top_L = Attribute(caption=u'Изображение у оружейника (вид сверху, лево)', tags='client')


class Cannon(Weapon):
    is_auto = False
    dmg = FloatAttribute(caption=u'Урон за выстрел')
    time_recharge = FloatAttribute(caption=u'Время перезарядки (с)')


class MachineGun(Weapon):
    is_auto = True
    dps = FloatAttribute(caption=u'Урон в секунду')
