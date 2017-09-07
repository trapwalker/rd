# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from tornado.template import Template
from sublayers_common.site_locale import locale
from sublayers_server.model.registry_me.tree import (
    Node, 
    StringField, IntField, ListField, FloatField,
    RegistryLinkField,
    LocalizedStringField, LocalizedString,
)


class Perk(Node):
    icon = StringField(caption=u'Пиктограмма перка', tags={'client'})
    description = LocalizedStringField(caption=u'Расширенное описание перка')

    driving_req     = IntField(caption=u"Необходимый уровень навыка вождения", tags={'client'})
    shooting_req    = IntField(caption=u"Необходимый уровень навыка стрельбы", tags={'client'})
    masking_req     = IntField(caption=u"Необходимый уровень навыка маскировки", tags={'client'})
    leading_req     = IntField(caption=u"Необходимый уровень навыка лидерства", tags={'client'})
    trading_req     = IntField(caption=u"Необходимый уровень навыка торговли", tags={'client'})
    engineering_req = IntField(caption=u"Необходимый уровень навыка инженеринга", tags={'client'})
    level_req       = IntField(caption=u"Необходимый уровень персонажа", tags={'client'})
    perks_req       = ListField(
        caption=u'Список прокачанных перков',
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.perks.Perk'),
    )
    role_class_req  = RegistryLinkField(
        caption=u"Требование к ролевому классу",
        document_type='sublayers_server.model.registry_me.classes.role_class.RoleClass',
    )

    def can_apply(self, agent_ex):
        agent_lvl = 0  # todo: взять уровень как-то правильно из агента  (ДОБАВИТЬ проверку по LVL)
        if (
            self.driving_req <= agent_ex.profile.driving.calc_value() and
            self.masking_req <= agent_ex.profile.masking.calc_value() and
            self.shooting_req <= agent_ex.profile.shooting.calc_value() and
            self.leading_req <= agent_ex.profile.leading.calc_value() and
            self.trading_req <= agent_ex.profile.trading.calc_value() and
            self.engineering_req <= agent_ex.profile.engineering.calc_value()
        ):
            for perk in self.perks_req:
                if perk not in agent_ex.profile.perks:
                    return False
                # todo: Здесь проверка по role_class
                if self.role_class_req and agent_ex.profile.role_class.node_hash() != self.role_class_req.node_hash():
                    return False
            return True
        return False

    def as_client_dict(self):
        d = super(Perk, self).as_client_dict()
        d.update(
            uri=self.uri,
            description=self.html_description,
            description_locale=self.description,
        )
        return d

    PUBLIC_PARAMS = [
        'driving_req',
        'shooting_req',
        'masking_req',
        'leading_req',
        'trading_req',
        'engineering_req',
        'level_req',
        'role_class_req',
    ]

    HTML_DESCRIPTION_TEMPLATE = Template(u"""
        <br>
        {% for param in thisperk.PUBLIC_PARAMS %}
            {% set v = getattr(this, param, None) %}
            {% if v %}                
                <div class="mechanic-description-line left-align">{{ _('pht__' + param) }}: {{ v }}</div>                
            {% end %}
        {% end %}
        <div class="mechanic-description-line left-align">{{ _('pht__need_perks') }}:
            {% if this.perks_req %}
                {{ _(this.perks_req[0].title) }}{% for p in this.perks_req[1:] %}, {{ _(p.title) }}{% end %}
            {% else %}
                --
            {% end %}
        </div>
        <div class="mechanic-description-line left-align">{{ _('pht__effect') }}: {{ _(this.description) }}</div>
    """, whitespace='oneline')

    @property
    def html_description(self):
        html_description = getattr(self, '_html_description', None)
        if html_description is None:
            template = self.HTML_DESCRIPTION_TEMPLATE
            html_description = self._html_description = LocalizedString(
                en=template.generate(this=self, _=lambda key: locale('en', key)),
                ru=template.generate(this=self, _=lambda key: locale('ru', key)),
            )
        return html_description


class PerkPassive(Perk):
    p_visibility_min   = FloatField(caption=u"Коэффициент минимальной заметности")
    p_visibility_max   = FloatField(caption=u"Коэффициент максимальной заметности")
    p_observing_range  = FloatField(caption=u"Радиус обзора")
    max_hp             = FloatField(caption=u"Максимальное значение HP")
    r_min              = FloatField(caption=u"Минимальный радиус разворота")
    ac_max             = FloatField(caption=u"Максимальная перегрузка при развороте")
    max_control_speed  = FloatField(caption=u"Абсолютная максимальная скорость движения")
    v_forward          = FloatField(caption=u"Максимальная скорость движения вперед")
    v_backward         = FloatField(caption=u"Максимальная скорость движения назад")
    a_forward          = FloatField(caption=u"Ускорение разгона вперед")
    a_backward         = FloatField(caption=u"Ускорение разгона назад")
    a_braking          = FloatField(caption=u"Ускорение торможения")
    max_fuel           = FloatField(caption=u"Максимальное количество топлива")
    p_fuel_rate        = FloatField(caption=u"Расход топлива (л/с)")
    p_armor            = FloatField(caption=u"Броня автомобиля")
    dps_rate           = FloatField(caption=u"Множитель модификации урона автоматического оружия")
    damage_rate        = FloatField(caption=u"Множитель модификации урона залпового оружия")
    time_recharge_rate = FloatField(caption=u"Множитель модификации времени перезарядки залпового оружия")
    radius_rate        = FloatField(caption=u"Множитель модификации дальности стрельбы")


class PerkRepairPassive(PerkPassive):
    repair_rate = FloatField(root_default=0, caption=u"Процент ХП восстанавливающийся каждую секунду")
    repair_rate_on_stay = FloatField(root_default=0, caption=u"Процент ХП восстанавливающийся каждую секунду в стоячем положении")


class PerkCritPassive(PerkPassive):
    crit_rate = FloatField(caption=u"Шанс крита [0 .. сколько угодно, но больше 1 нет смысла]")
    crit_power = FloatField(caption=u"Сила крита [0 .. сколько угодно]")


class PerkPartyPassive(PerkPassive):
    additional_capacity = IntField(root_default=0, caption=u"Дополнительные слоты в пати")
    party_exp_modifier = FloatField(root_default=0, caption=u"Процент увеличение экспы в пати")


class PerkActivateItemsPassive(PerkPassive):  # Перки, влияющие на активацию итемов
    repair_build_rate = FloatField(root_default=0, caption=u"Коэффициент дополнительного хила от ремкомплектов")


class PerkTraderPassive(PerkPassive):
    trader_sell = FloatField(root_default=0, caption=u"Уменьшение маржи торговца при покупке у торговца")
    trader_buy = FloatField(root_default=0, caption=u"Уменьшение маржи торговца при продаже торговцу")
