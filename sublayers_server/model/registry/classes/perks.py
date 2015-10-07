# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute, FloatAttribute, TextAttribute, IntAttribute


class Perk(Root):
    icon = Attribute(caption=u'Пиктограмма перка')
    description = TextAttribute(caption=u'Расширенное описание перка')

    driving_req = IntAttribute(default=0, caption=u"Необходимый уровень навыка вождения")
    shooting_req = IntAttribute(default=0, caption=u"Необходимый уровень навыка стрельбы")
    masking_req = IntAttribute(default=0, caption=u"Необходимый уровень навыка маскировки")
    leading_req = IntAttribute(default=0, caption=u"Необходимый уровень навыка лидерства")
    trading_req = IntAttribute(default=0, caption=u"Необходимый уровень навыка торговли")
    engineering_req = IntAttribute(default=0, caption=u"Необходимый уровень навыка инженеринга")

    level_req = IntAttribute(default=0, caption=u"Необходимый уровень персонажа")

    # todo: добавить список других перков


class PerkPassive(Perk):
    p_visibility = FloatAttribute(default=0, caption=u"Коэффициент заметности")
    p_observing_range = FloatAttribute(default=0, caption=u"Радиус обзора")
    max_hp = FloatAttribute(default=0, caption=u"Максимальное значение HP")
    r_min = FloatAttribute(default=0, caption=u"Минимальный радиус разворота")
    ac_max = FloatAttribute(default=0, caption=u"Максимальная перегрузка при развороте")
    max_control_speed = FloatAttribute(default=0, caption=u"Абсолютная максимальная скорость движения")
    v_forward = FloatAttribute(default=0, caption=u"Максимальная скорость движения вперед")
    v_backward = FloatAttribute(default=0, caption=u"Максимальная скорость движения назад")
    a_forward = FloatAttribute(default=0, caption=u"Ускорение разгона вперед")
    a_backward = FloatAttribute(default=0, caption=u"Ускорение разгона назад")
    a_braking = FloatAttribute(default=0, caption=u"Ускорение торможения")
    max_fuel = FloatAttribute(default=0, caption=u"Максимальное количество топлива")
    p_fuel_rate = FloatAttribute(default=0, caption=u"Расход топлива (л/с)")

    dps_rate = FloatAttribute(default=0, caption=u"Множитель модификации урона автоматического оружия")
    damage_rate = FloatAttribute(default=0, caption=u"Множитель модификации урона залпового оружия")
    time_recharge_rate = FloatAttribute(default=0, caption=u"Множитель модификации времени перезарядки залпового оружия")
    radius_rate = FloatAttribute(default=0, caption=u"Множитель модификации дальности стрельбы")