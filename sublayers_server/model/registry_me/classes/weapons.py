# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.item import ArmorerItem, Item
from sublayers_server.model.registry_me.tree import (
    StringField, FloatField, ListField,
    RegistryLinkField, EmbeddedNodeField,
    LocalizedString,
)

from tornado.template import Template


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

    HTML_DESCRIPTION_TEMPLATE = Template(u"""
        <div class="description-line left-align small">{{ _('w__weight_class') }}:</div><div class="description-line right-align small">
            {{ {
                1: _('w__weight_class__light'),
                2: _('w__weight_class__middle'),
                3: _('w__weight_class__heavy'),
            }.get(this.weight_class, _('w__weight_class__undefined')) }}
        </div>
        <div class="description-line left-align">{{ _('w__damage') }}:</div><div class="description-line right-align">{{ this.dmg }}</div>
        <div class="description-line left-align">{{ _('w__time_recharge') }}:</div><div class="description-line right-align">{{ this.time_recharge }} s</div>
        <div class="description-line left-align small">{{ _('w__radius') }}:</div><div class="description-line right-align small">{{ '{:0f}'.format(this.radius) }} m</div>
        <div class="description-line left-align small">{{ _('w__sector') }}:</div><div class="description-line right-align small">{{ '{:0f}'.format(this.width) }}°</div>
        <div class="description-line left-align">{{ _('w__power_penetration') }}:</div><div class="description-line right-align">{{ '{:0f}'.format(this.power_penetration) }}</div>
        <div class="description-line left-align small">{{ _('w__ammo') }}:</div><div class="description-line right-align small">{{ this.ammo and _(this.ammo.doc) }}</div>
    """, whitespace='oneline')


class MachineGun(Weapon):
    is_auto = True
    dps = FloatField(caption=u'Урон в секунду')
    animation_tracer_rate = FloatField(caption=u'Количество трассеров отрисовываемых в секунду')

    HTML_DESCRIPTION_TEMPLATE = Template(u"""
        <div class="description-line left-align small">{{ _('w__weight_class') }}:</div><div class="description-line right-align small">
            {{ {
                1: _('w__weight_class__light'),
                2: _('w__weight_class__middle'),
                3: _('w__weight_class__heavy'),
            }.get(this.weight_class, _('w__weight_class__undefined')) }}
        </div>
        <div class="description-line left-align">{{ _('w__dps') }}:</div><div class="description-line right-align">{{ this.dps }}</div>
        <div class="description-line left-align small">{{ _('w__radius') }}:</div><div class="description-line right-align small">{{ '{:0f}'.format(this.radius) }} m</div>
        <div class="description-line left-align small">{{ _('w__sector') }}:</div><div class="description-line right-align small">{{ '{:0f}'.format(this.width) }}°</div>
        <div class="description-line left-align">{{ _('w__power_penetration') }}:</div><div class="description-line right-align">{{ '{:0f}'.format(this.power_penetration) }}</div>
        <div class="description-line left-align small">{{ _('w__ammo') }}:</div><div class="description-line right-align small">{{ this.ammo and _(this.ammo.doc) }}</div>
    """, whitespace='oneline')
