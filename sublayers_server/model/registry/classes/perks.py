# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.odm.fields import (
    UniReferenceField, StringField, IntField, ListField, FloatField,
)


class Perk(Root):
    title = StringField(caption=u'Название перка', tags='client')
    icon = StringField(caption=u'Пиктограмма перка', tags='client')
    description = StringField(caption=u'Расширенное описание перка', tags='client')

    driving_req = IntField(default=0, caption=u"Необходимый уровень навыка вождения", tags='client')
    shooting_req = IntField(default=0, caption=u"Необходимый уровень навыка стрельбы", tags='client')
    masking_req = IntField(default=0, caption=u"Необходимый уровень навыка маскировки", tags='client')
    leading_req = IntField(default=0, caption=u"Необходимый уровень навыка лидерства", tags='client')
    trading_req = IntField(default=0, caption=u"Необходимый уровень навыка торговли", tags='client')
    engineering_req = IntField(default=0, caption=u"Необходимый уровень навыка инженеринга", tags='client')
    level_req = IntField(default=0, caption=u"Необходимый уровень персонажа", tags='client')
    perks_req = ListField(
        caption=u'Список прокачанных перков',
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.perks.Perk'),
    )
    role_class_req = UniReferenceField(
        caption=u"Требование к ролевому классу",
        reference_document_type='sublayers_server.model.registry.classes.role_class.RoleClass',
    )

    def can_apply(self, agent_ex):
        agent_lvl = 0  # todo: взять уровень как-то правильно из агента  (ДОБАВИТЬ проверку по LVL)
        if (self.driving_req <= agent_ex.driving.calc_value()) and (self.masking_req <= agent_ex.masking.calc_value()) and \
           (self.shooting_req <= agent_ex.shooting.calc_value()) and (self.leading_req <= agent_ex.leading.calc_value()) and \
           (self.trading_req <= agent_ex.trading.calc_value()) and \
           (self.engineering_req <= agent_ex.engineering.calc_value()):
            for perk in self.perks_req:
                if self.storage[perk] not in agent_ex.perks:
                    return False
                # todo: Здесь проверка по role_class
                if self.role_class_req and agent_ex.role_class.node_hash() != self.role_class_req.node_hash():
                    return False
            return True
        return False


class PerkPassive(Perk):
    p_visibility_min = FloatField(default=0, caption=u"Коэффициент минимальной заметности")
    p_visibility_max = FloatField(default=0, caption=u"Коэффициент максимальной заметности")
    p_observing_range = FloatField(default=0, caption=u"Радиус обзора")
    max_hp = FloatField(default=0, caption=u"Максимальное значение HP")
    r_min = FloatField(default=0, caption=u"Минимальный радиус разворота")
    ac_max = FloatField(default=0, caption=u"Максимальная перегрузка при развороте")
    max_control_speed = FloatField(default=0, caption=u"Абсолютная максимальная скорость движения")
    v_forward = FloatField(default=0, caption=u"Максимальная скорость движения вперед")
    v_backward = FloatField(default=0, caption=u"Максимальная скорость движения назад")
    a_forward = FloatField(default=0, caption=u"Ускорение разгона вперед")
    a_backward = FloatField(default=0, caption=u"Ускорение разгона назад")
    a_braking = FloatField(default=0, caption=u"Ускорение торможения")
    max_fuel = FloatField(default=0, caption=u"Максимальное количество топлива")
    p_fuel_rate = FloatField(default=0, caption=u"Расход топлива (л/с)")

    dps_rate = FloatField(default=0, caption=u"Множитель модификации урона автоматического оружия")
    damage_rate = FloatField(default=0, caption=u"Множитель модификации урона залпового оружия")
    time_recharge_rate = FloatField(default=0, caption=u"Множитель модификации времени перезарядки залпового оружия")
    radius_rate = FloatField(default=0, caption=u"Множитель модификации дальности стрельбы")


class PerkRepairPassive(PerkPassive):
    repair_rate = FloatField(default=0, caption=u"Скорость отхила в секунду")
    repair_rate_on_stay = FloatField(default=0, caption=u"Дополнительная скорость отхила в стоячем положении")


class PerkCritPassive(PerkPassive):
    crit_rate = FloatField(default=0, caption=u"Шанс крита [0 .. сколько угодно, но больше 1 нет смысла]")
    crit_power = FloatField(default=0, caption=u"Сила крита [0 .. сколько угодно]")
