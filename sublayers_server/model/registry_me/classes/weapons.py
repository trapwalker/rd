# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.item import ArmorerItem, Item
from sublayers_server.model.registry_me.tree import (
    StringField, FloatField, ListField, ParamRange,
    RegistryLinkField, EmbeddedDocumentField,
    LocalizedString,
)

from math import floor

from tornado.template import Template


class RocketLauncher(ArmorerItem):
    pass


class Weapon(ArmorerItem):
    ammo = RegistryLinkField(caption=u'Боеприпас', document_type=Item,)  # todo: store set of ammo types
    direction = StringField(caption=u'Направление (FBRL)', tags={'client'})
    ammo_per_shot = FloatField(caption=u'Расход патронов за выстрел (< 0)')
    ammo_per_second = FloatField(caption=u'Расход патронов в секунду')
    radius = FloatField(caption=u'Дальность стрельбы (м)', tags={"param_randomize"})
    width = FloatField(caption=u'Ширина сектора стрельбы (град)', tags={"param_randomize"})
    power_penetration = FloatField(caption=u'Мощность оружия (пробитие)')
    weapon_audio = ListField(caption=u'Имена звуков стрельбы', field=StringField(), tags={'client'})
    weapon_animation = ListField(caption=u'Типы анимаций', field=StringField(), tags={'client'})

    # Атрибуты для рандомных параметров
    rand_range_radius = EmbeddedDocumentField(document_type=ParamRange)
    rand_range_width = EmbeddedDocumentField(document_type=ParamRange)

    rand_modifier_radius = FloatField(root_default=1.0)
    rand_modifier_width = FloatField(root_default=1.0)

    def set_condition(self):
        self._condition = 0
        rating = 0
        count_of_rating = 0
        max_count_ration = 5


        def get_rating(value, min_value, max_value, rating_count):
            lvl_distance = (max_value - min_value) / rating_count
            if lvl_distance == 0:
                return 0
            return floor((value - min_value) / lvl_distance)

        for param_name, attr, getter in self.iter_attrs(tags={"param_randomize"}):
            param_range = getattr(self, "rand_range_{}".format(param_name))
            if param_range:
                mod_name = "rand_modifier_{}".format(param_name)
                mod_value = getattr(self, mod_name)
                if not param_range.in_range(mod_value):
                    mod_value = max(param_range.min, min(param_range.max, mod_value))
                    setattr(self, mod_name, mod_value)
                    log.warn("Change {} for {!r}. New value is {}".format(mod_name, self, mod_value))
                rating += get_rating(mod_value, param_range.min, param_range.max, max_count_ration)
                count_of_rating += 1
            else:
                log.warn("randomize_params:: Range not found for {}".format(param_name))

        if count_of_rating > 0:
            self._condition = int(floor(rating / count_of_rating) + 1)
            if self._condition > max_count_ration:
                self._condition = max_count_ration
            self.condition = self._condition

    def randomize_params(self, options=None):
        """
        Устанавливает значения коэффициентов rand_modifier_*.
        Устанавливает из options или выбирает случайно из rand_range_* диапазона
        """
        from_trader = options and options.get("from_trader", None)  # Вызвано из транзакции торговца (значит не рандомим, а ставим как у родителя)
        for param_name, attr, getter in self.iter_attrs(tags={"param_randomize"}):
            param_range = getattr(self, "rand_range_{}".format(param_name))
            if param_range:
                mod_name = "rand_modifier_{}".format(param_name)
                options_value = options and options.get(mod_name, None)
                if from_trader:
                    value = getattr(self, mod_name)
                else:
                    value = param_range.get_random_value()
                value = options_value if options_value is not None and param_range.in_range(value) else value
                setattr(self, mod_name, value)
            else:
                log.warn("randomize_params:: Range not found for {}".format(param_name))

        # Обновить параметр condition
        self.set_condition()

    @property
    def title_with_condition(self):
        if not getattr(self, "_condition", None):
            self.set_condition()
        return super(Weapon, self).title_with_condition

    @property
    def real_width(self):
        return self.width * self.rand_modifier_width

    @property
    def real_radius(self):
        return self.radius * self.rand_modifier_radius



class Cannon(Weapon):
    is_auto = False
    dmg = FloatField(caption=u'Урон за выстрел', tags={"param_randomize"})
    area_dmg = FloatField(caption=u'Урон за выстрел')
    time_recharge = FloatField(caption=u'Время перезарядки (с)')

    rand_range_dmg = EmbeddedDocumentField(document_type=ParamRange)
    rand_modifier_dmg = FloatField(root_default=1.0)

    HTML_DESCRIPTION_TEMPLATE = Template(u"""
        <div class="description-line left-align small">{{ _('w__weight_class') }}:</div><div class="description-line right-align small">
            {{ {
                1: _('w__weight_class__light'),
                2: _('w__weight_class__middle'),
                3: _('w__weight_class__heavy'),
            }.get(this.weight_class, _('w__weight_class__undefined')) }}
        </div>
        <div class="description-line left-align">{{ _('w__damage') }}:</div><div class="description-line right-align">{{ "{0:.2f}".format(this.real_dmg) }}</div>
        <div class="description-line left-align">{{ _('w__time_recharge') }}:</div><div class="description-line right-align">{{ this.time_recharge }} s</div>
        <div class="description-line left-align small">{{ _('w__radius') }}:</div><div class="description-line right-align small">{{ '{0:.2f}'.format(this.real_radius) }} m</div>
        <div class="description-line left-align small">{{ _('w__sector') }}:</div><div class="description-line right-align small">{{ '{0:.2f}'.format(this.real_width) }}°</div>
        <div class="description-line left-align">{{ _('w__power_penetration') }}:</div><div class="description-line right-align">{{ '{:.0f}'.format(this.power_penetration) }}</div>
        <div class="description-line left-align small">{{ _('w__ammo') }}:</div><div class="description-line right-align small">{{ this.ammo and _(this.ammo.title).replace("<br>", " ") }}</div>
    """, whitespace='oneline')

    @property
    def real_dmg(self):
        return self.dmg * self.rand_modifier_dmg


class MachineGun(Weapon):
    is_auto = True
    dps = FloatField(caption=u'Урон в секунду', tags={"param_randomize"})
    animation_tracer_rate = FloatField(caption=u'Количество трассеров отрисовываемых в секунду')

    rand_range_dps = EmbeddedDocumentField(document_type=ParamRange)
    rand_modifier_dps = FloatField(root_default=1.0)

    HTML_DESCRIPTION_TEMPLATE = Template(u"""
        <div class="description-line left-align small">{{ _('w__weight_class') }}:</div><div class="description-line right-align small">
            {{ {
                1: _('w__weight_class__light'),
                2: _('w__weight_class__middle'),
                3: _('w__weight_class__heavy'),
            }.get(this.weight_class, _('w__weight_class__undefined')) }}
        </div>
        <div class="description-line left-align small">{{ _('w__dps') }}:</div><div class="description-line right-align small">{{ "{0:.2f}".format(this.real_dps) }}</div>
        <div class="description-line left-align small">{{ _('w__radius') }}:</div><div class="description-line right-align small">{{ '{0:.2f}'.format(this.real_radius) }} m</div>
        <div class="description-line left-align small">{{ _('w__sector') }}:</div><div class="description-line right-align small">{{ '{0:.2f}'.format(this.real_width) }}°</div>
        <div class="description-line left-align">{{ _('w__power_penetration') }}:</div><div class="description-line right-align">{{ '{:.0f}'.format(this.power_penetration) }}</div>
        <div class="description-line left-align small">{{ _('w__ammo') }}:</div><div class="description-line right-align small">{{ this.ammo and _(this.ammo.title).replace("<br>", " ") }}</div>
    """, whitespace='oneline')

    @property
    def real_dps(self):
        return self.dps * self.rand_modifier_dps