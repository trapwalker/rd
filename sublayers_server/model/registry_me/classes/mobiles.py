# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.weapons import Weapon  # todo: осторожно с рекуррентным импортом
from sublayers_server.model.registry_me.classes.item import SlotLock, MechanicItem  # tpodo: перенести к описанию слота
from sublayers_server.model.registry_me.classes.inventory import InventoryField
from sublayers_server.model.registry_me.tree import (
    Node, Subdoc,
    IntField, StringField, FloatField, EmbeddedDocumentField, ListField,
    RegistryLinkField, EmbeddedNodeField, PositionField, BooleanField,
    LocalizedStringField,
)
import random

SLOT_LOCK = "reg:///registry/items/slot_item/_lock"

class SlotField(EmbeddedNodeField):
    def __init__(self, document_type='sublayers_server.model.registry_me.classes.item.SlotItem', reinst=True, errors='ignore', **kw):
        super(SlotField, self).__init__(document_type=document_type, reinst=reinst, errors=errors, **kw)


class ModuleSlotField(SlotField):
    def __init__(self, root_default=SLOT_LOCK, **kw):
        super(ModuleSlotField, self).__init__(root_default=root_default, **kw)


class ParamRange(Subdoc):
    min = FloatField(default=1.0, doc=u"Минимальное значение генерации")
    max = FloatField(default=1.0, doc=u"Максимальное значение генерации")

    def __init__(self, **kw):
        super(ParamRange, self).__init__(**kw)
        self.min, self.max = min(self.max, self.min), max(self.max, self.min)

    def get_random_value(self):
        return self.min + random.random() * (self.max - self.min)

    def in_range(self, value):
        return self.min <= value <= self.max


class Mobile(Node):
    u"""
    Tags:
        - parameter - для атрибута с таким тегом будет создан модельный объект Parameter
        - param_aggregate - атрибуты с данным тегов будут обрабатываться в функции param_aggregate
    """

    # Требование к уровню вождения
    needed_driving = IntField(caption=u"Требование к прокачке уровня вождения")

    # атрибуты от PointObject
    position = PositionField(caption=u"Последние координаты объекта", reinst=True)

    # Последняя посещенная локация
    last_location = RegistryLinkField(
        caption=u'Последняя посещенная локация',
        document_type="sublayers_server.model.registry_me.classes.poi.MapLocation",
    )

    # Статистика
    value_exp = FloatField(root_default=0, caption=u"Количество опыта")
    value_frag = IntField(root_default=0, caption=u"Количество убийств")
    _way = FloatField(root_default=0, caption=u"Пройденный путь")

    k_way_exp = FloatField(caption=u"Коэффициент экпы от пройдённого пути")

    # атрибуты от ObserverObjects
    p_observing_range    = FloatField(caption=u"Радиус обзора", tags={'parameter', 'param_aggregate'})

    # атрибуты от VisibleObjects
    p_vigilance          = FloatField(caption=u"Коэффициент зоркости", tags={'parameter', 'param_aggregate'})
    p_visibility_min     = FloatField(caption=u"Минимальный коэффициент заметности", tags={'parameter', 'param_aggregate'})
    p_visibility_max     = FloatField(caption=u"Максимальный коэффициент заметности", tags={'parameter', 'param_aggregate'})
    p_obs_range_rate_min = FloatField(caption=u"Коэффициент радиуса обзора при максимальной скорости", tags={'parameter', 'param_aggregate'})
    p_obs_range_rate_max = FloatField(caption=u"Коэффициент радиуса обзора при скорости = 0", tags={'parameter', 'param_aggregate'})

    # атрибуты от Unit
    p_armor              = FloatField(caption=u"Броня машинки", tags={'parameter', 'param_aggregate', "param_randomize"})
    p_radiation_armor    = FloatField(caption=u"Уровень защиты от радиации (0-100)", tags={'parameter', 'param_aggregate'})


    # Модификаторы эффектов зон
    m_cc_dirt            = FloatField(caption=u"Модификатор CC на бездорожье", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_cc_wood            = FloatField(caption=u"Модификатор CC в лесу", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_visibility_wood    = FloatField(caption=u"Модификатор видимости в лесу", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_observing_range_wood = FloatField(caption=u"Модификатор обзора в лесу", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_cc_slope           = FloatField(caption=u"Модификатор CC в горах", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_cc_water           = FloatField(caption=u"Модификатор CC на воде", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_r_cc_wood_on_road  = FloatField(caption=u"Модификатор резиста штрафа СС в лесу на дороге", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_r_cc_water_on_road = FloatField(caption=u"Модификатор резиста штрафа СС в воде на дороге ", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_r_cc_dirt_on_road  = FloatField(caption=u"Модификатор резиста штрафа СС на бездорожье на дороге", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_r_cc_slope_on_road = FloatField(caption=u"Модификатор резиста штрафа СС в горах на дороге", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_r_cc_dirt          = FloatField(caption=u"Модификатор резиста бездорожья для отмены бездорожья", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_cc_mine            = FloatField(caption=u"Модификатор CC замедляющей мины", tags={'parameter', 'p_modifier', 'param_aggregate'})
    m_cc_fuel_empty      = FloatField(caption=u"Модификатор CC при пустом баке", tags={'parameter', 'p_modifier', 'param_aggregate'})

    # Резисты к модификаторам эффетов зон
    r_empty                = FloatField(caption=u"Пустой резист", tags={'parameter', 'p_resist', 'param_aggregate'})
    r_cc_dirt              = FloatField(caption=u"Резист к модификатору CC на бездорожье", tags={'parameter', 'p_resist', 'param_aggregate'})
    r_cc_wood              = FloatField(caption=u"Резист к модификатору CC в лесу", tags={'parameter', 'p_resist', 'param_aggregate'})
    r_visibility_wood      = FloatField(caption=u"Резист к модификатору видимости в лесу", tags={'parameter', 'p_resist', 'param_aggregate'})
    r_observing_range_wood = FloatField(caption=u"Резист к модификатору обзора в лесу", tags={'parameter', 'p_resist', 'param_aggregate'})
    r_cc_slope             = FloatField(caption=u"Резист к модификатору CC в горах", tags={'parameter', 'p_resist', 'param_aggregate'})
    r_cc_water             = FloatField(caption=u"Резист к модификатору CC в воде", tags={'parameter', 'p_resist', 'param_aggregate'})
    r_cc_mine              = FloatField(caption=u"Резист к модификатору CC замедляющей мины", tags={'parameter', 'p_resist', 'param_aggregate'})
    r_cc_fuel_empty        = FloatField(caption=u"Резист к модификатору CC при пустом баке", tags={'parameter', 'p_resist', 'param_aggregate'})

    # Резисты и модификаторы PowerUps
    r_observing_range_qg_pu = FloatField(caption=u"Резист к модификатору дальности обзора PowerUp", tags={'parameter', 'p_resist', 'param_aggregate'})
    m_observing_range_qg_pu = FloatField(caption=u"Модификатор к дальности обзора PowerUp", tags={'parameter', 'p_modifier', 'param_aggregate'})
    r_visibility_qg_pu   = FloatField(caption=u"Резист к модификатору заметности PowerUp", tags={'parameter', 'p_resist', 'param_aggregate'})
    m_visibility_qg_pu   = FloatField(caption=u"Модификатор к заметности PowerUp", tags={'parameter', 'p_modifier', 'param_aggregate'})

    # атрибуты от Unit
    max_hp               = FloatField(caption=u"Максимальное значение HP", tags={'param_aggregate', 'client', "param_randomize"})
    hp                   = FloatField(caption=u"Текущее значение HP", tags={'client', 'param_aggregate'})
    direction            = FloatField(caption=u"Текущее направление машины")

    # атрибуты Mobile
    r_min                = FloatField(caption=u"Минимальный радиус разворота", tags={'param_aggregate'})
    mobility             = FloatField(root_default=0, caption=u"Манёвренность машинки", tags={'param_aggregate', "param_randomize"})  # former ac_max
    max_control_speed    = FloatField(caption=u"Абсолютная максимальная скорость движения", tags={'param_aggregate'})
    v_forward            = FloatField(caption=u"Максимальная скорость движения вперед", tags={'param_aggregate', "param_randomize"})
    v_backward           = FloatField(caption=u"Максимальная скорость движения назад", tags={'param_aggregate'})
    a_forward            = FloatField(caption=u"Ускорение разгона вперед", tags={'param_aggregate', "param_randomize"})
    a_backward           = FloatField(caption=u"Ускорение разгона назад", tags={'param_aggregate'})
    a_braking            = FloatField(caption=u"Ускорение торможения", tags={'param_aggregate'})

    max_fuel             = FloatField(caption=u"Максимальное количество топлива", tags={'client', 'param_aggregate'})
    fuel                 = FloatField(caption=u"Текущее количество топлива", tags={'client', 'param_aggregate'})
    p_fuel_rate          = FloatField(caption=u"Расход топлива (л/с)", tags={'param_aggregate', "param_randomize"})

    # атрибуты влияющие на эффективность стрельбы
    dps_rate             = FloatField(root_default=1.0, caption=u"Множитель модификации урона автоматического оружия", tags={'param_aggregate'})
    damage_rate          = FloatField(root_default=1.0, caption=u"Множитель модификации урона залпового оружия", tags={'param_aggregate'})
    time_recharge_rate   = FloatField(root_default=1.0, caption=u"Множитель модификации времени перезарядки залпового оружия", tags={'param_aggregate'})
    radius_rate          = FloatField(root_default=1.0, caption=u"Множитель модификации дальности стрельбы", tags={'param_aggregate'})

    # атрибуты, отвечающие за авто-ремонт машины. Равны 1, так как потом эти числа умножатся на значения от перков (%)
    repair_rate          = FloatField(root_default=1.0, caption=u"Процент ХП восстанавливающийся каждую секунду", tags={'param_aggregate'})
    repair_rate_on_stay  = FloatField(root_default=1.0, caption=u"Процент ХП восстанавливающийся каждую секунду в стоячем положении", tags={'param_aggregate'})

    # атрибуты, связанные с критами.
    crit_rate            = FloatField(root_default=1.0, caption=u"Шанс крита [0 .. сколько угодно, но больше 1 нет смысла]", tags={'param_aggregate'})
    crit_power           = FloatField(root_default=1.0, caption=u"Сила крита [0 .. сколько угодно]", tags={'param_aggregate'})


    # Атрибуты для рандомных параметров
    rand_range_max_hp = EmbeddedDocumentField(document_type=ParamRange)
    rand_range_v_forward = EmbeddedDocumentField(document_type=ParamRange)
    rand_range_a_forward = EmbeddedDocumentField(document_type=ParamRange)
    rand_range_p_fuel_rate = EmbeddedDocumentField(document_type=ParamRange)
    rand_range_p_armor = EmbeddedDocumentField(document_type=ParamRange)
    rand_range_mobility = EmbeddedDocumentField(document_type=ParamRange)

    rand_modifier_max_hp = FloatField(root_default=1.0)
    rand_modifier_v_forward = FloatField(root_default=1.0)
    rand_modifier_a_forward = FloatField(root_default=1.0)
    rand_modifier_p_fuel_rate = FloatField(root_default=1.0)
    rand_modifier_p_armor = FloatField(root_default=1.0)
    rand_modifier_mobility = FloatField(root_default=1.0)


    slot_FL   = ModuleSlotField(caption=u'ForwardLeftSlot', doc=u'Передний левый слот', tags={'armorer'})
    slot_FL_f = StringField    (caption=u'Флаги переднего левого слота [FBLR]', tags={'client', 'slot_limit'})
    slot_CL   = ModuleSlotField(caption=u'LeftSlot', doc=u'Центральный левый слот', tags={'armorer'})
    slot_CL_f = StringField    (caption=u'Флаги центрального левого слота [FBLR]', tags={'client', 'slot_limit'})
    slot_BL   = ModuleSlotField(caption=u'BackwardLeftSlot', doc=u'Задний левый слот', tags={'armorer'})
    slot_BL_f = StringField    (caption=u'Флаги залнего левого слота [FBLR]', tags={'client', 'slot_limit'})

    slot_FC   = ModuleSlotField(caption=u'ForwardSlot', doc=u'Передний средний слот', tags={'armorer'})
    slot_FC_f = StringField    (caption=u'Флаги переднего среднего слота [FBLR]', tags={'client', 'slot_limit'})
    slot_CC   = ModuleSlotField(caption=u'CentralSlot', doc=u'Центральный средний слот', tags={'armorer'})
    slot_CC_f = StringField    (caption=u'Флаги центрального среднего слота [FBLR]', tags={'client', 'slot_limit'})
    slot_BC   = ModuleSlotField(caption=u'BackwardSlot', doc=u'Задний средний слот', tags={'armorer'})
    slot_BC_f = StringField    (caption=u'Флаги заднего среднего слота [FBLR]', tags={'client', 'slot_limit'})

    slot_FR   = ModuleSlotField(caption=u'ForwardRightSlot', doc=u'Передний правый слот', tags={'armorer'})
    slot_FR_f = StringField    (caption=u'Флаги переднего правого слота [FBLR]', tags={'client', 'slot_limit'})
    slot_CR   = ModuleSlotField(caption=u'RightSlot', doc=u'Центральный правый слот', tags={'armorer'})
    slot_CR_f = StringField    (caption=u'Флаги центрального правого слота [FBLR]', tags={'client', 'slot_limit'})
    slot_BR   = ModuleSlotField(caption=u'BackwardRightSlot', doc=u'Задний правый слот', tags={'armorer'})
    slot_BR_f = StringField    (caption=u'Флаги заднего правого слота [FBLR]', tags={'client', 'slot_limit'})

    inventory = InventoryField(caption=u'Инвентарь', doc=u'Список предметов в инвентаре ТС')
    # inventory_size = IntField(caption=u"Размер инвентаря")

    # todo: реализовать предынициализацию инвентаря абстрактным в конструкторе
    price = FloatField(caption=u"Цена", tags={'client'})
    base_exp_price = FloatField(root_default=1, caption=u"Цена")

    # Косметика
    class_car     = LocalizedStringField(caption=u"Класс автомобиля", tags={'client'})
    sub_class_car = StringField(caption=u"Подкласс автомобиля", tags={'client'})
    name_car      = StringField(caption=u"Название автомобиля", tags={'client'})

    # Влияние скилов
    driving_r_min             = FloatField(caption=u"Влияние Вождения на Минимальный радиус разворота")
    driving_mobility          = FloatField(caption=u"Влияние Вождения на Манёвренность при поворотах")  # former ac_max
    driving_max_control_speed = FloatField(caption=u"Влияние Вождения на Абсолютную максимальную скорость движения")
    driving_v_forward         = FloatField(caption=u"Влияние Вождения на Максимальную скорость движения вперед")
    driving_v_backward        = FloatField(caption=u"Влияние Вождения на Максимальную скорость движения назад")
    driving_a_forward         = FloatField(caption=u"Влияние Вождения на Ускорение разгона вперед")
    driving_a_backward        = FloatField(caption=u"Влияние Вождения на Ускорение разгона назад")
    driving_a_braking         = FloatField(caption=u"Влияние Вождения на Ускорение торможения")

    shooting_dps_rate           = FloatField(caption=u"Влияние Стрельбы на Множитель модификации урона автоматического оружия")
    shooting_damage_rate        = FloatField(caption=u"Влияние Стрельбы на Множитель модификации урона залпового оружия")
    shooting_time_recharge_rate = FloatField(caption=u"Влияние Стрельбы на Множитель модификации времени перезарядки залпового оружия")
    shooting_radius_rate        = FloatField(caption=u"Влияние Стрельбы на Множитель модификации дальности стрельбы")

    # masking_p_visibility        = FloatField(root_default=0, caption=u"Влияние Маскировки на Коэффициент заметности")  # Не используется
    masking_p_visibility_min    = FloatField(root_default=0, caption=u"Влияние Маскировки на Коэффициент заметности")
    masking_p_visibility_max    = FloatField(root_default=0, caption=u"Влияние Маскировки на Коэффициент заметности")

    exp_table = RegistryLinkField(
        document_type='sublayers_server.model.registry_me.classes.exptable.ExpTable',
        caption=u"Таблица опыта",
    )

    start_shield_time           = FloatField(caption=u"Время действия стартового щита при появлении на карте")

    def iter_weapons(self):
        return (v for attr, v in self.iter_slots(tags={'armorer'}) if isinstance(v, Weapon))

    def iter_armorer_slots_name(self):
        return (attr for attr, v in self.iter_slots(tags={'armorer'}))

    def iter_slots(self, tags=None):
        for name, attr, getter in self.iter_attrs(tags=tags, classes=SlotField):
            v = getter()
            if not isinstance(v, SlotLock) and v is not False:  # todo: SlotLock
                yield name, v

    def iter_slots2(self, tags=None):
        for name, attr, getter in self.iter_attrs(tags=tags, classes=SlotField):
            v = getter()
            if not isinstance(v, SlotLock) and v is not False:  # todo: SlotLock
                yield name, v, attr

    def get_count_slots(self, tags=None):
        result = 0
        for name, attr, getter in self.iter_attrs(tags=tags, classes=SlotField):
            v = getter()
            if not isinstance(v, SlotLock) and v is not False:
                result += 1
        return result

    def get_modify_value(self, param_name, example_agent=None):
        original_value = getattr(self, param_name)
        # если этот параметр является рандомизируемым (tag=param_randomize), то учесть это
        attr = self.get_attribute(param_name)
        if attr:
            if "param_randomize" in attr.tags:
                r_mod = getattr(self, "rand_modifier_{}".format(param_name), None)
                if r_mod:
                    original_value *= r_mod
                else:
                    log.warn("rand_modifier for {} not found".format(param_name))
        else:
            log.warn("Attr with name {} not found in object: {}".format(param_name, self))

        modifier_value = 1.0  # собирающий коэффициент по перкам, квест_итемам и механик_итемам, НО НЕ ПО СКИЛАМ
        for slot_name, slot_value in self.iter_slots(tags={'mechanic'}):
            if isinstance(slot_value, MechanicItem):
                modifier_value += getattr(slot_value, param_name, 0.0)
        if example_agent:
            quest_items_modifiers = example_agent.profile.get_quest_skill_modifier()

            for skill_name, skill_value in example_agent.profile.iter_skills():
                skill_value = max(0.0, skill_value + quest_items_modifiers.get(skill_name, 0.0))
                modifier_value += skill_value * getattr(self, '{}_{}'.format(skill_name, param_name), 0.0)

            for perk in example_agent.profile.perks:
                modifier_value += getattr(perk, param_name, 0.0) + getattr(quest_items_modifiers, param_name, 0.0)

            if param_name == 'v_forward':
                original_value *= example_agent.profile.exp_table.get_car_penalty(
                    dvalue=(self.needed_driving - example_agent.profile.driving.calc_value())
                )

        modifier_value = max(0, modifier_value)
        original_value *= modifier_value
        # todo: проверить допустимость значения
        assert original_value is not None, '{} is not allowed {}'.format(param_name, original_value)
        return original_value

    def param_aggregate(self, example_agent):
        d = dict()  # Здесь лежат оригинальные значения с учётом влияния скилов
        modifier_dict = dict()  # собирающий коэффициент по перкам, квест_итемам и механик_итемам, НО НЕ ПО СКИЛАМ
        for param_name, attr, getter in self.iter_attrs(tags={'param_aggregate'}):
            d[param_name] = getattr(self, param_name)
            modifier_dict[param_name] = 1.0
            # проверить, если этот параметр является рандомизируемым (tag=param_randomize), то учесть это
            if "param_randomize" in attr.tags:
                r_mod = getattr(self, "rand_modifier_{}".format(param_name), None)
                if r_mod:
                    d[param_name] *= r_mod
                else:
                    log.warn("rand_modifier for {} not found".format(param_name))

        for slot_name, slot_value in self.iter_slots(tags={'mechanic'}):
            if isinstance(slot_value, MechanicItem):
                for param_name in modifier_dict.keys():
                    modifier_dict[param_name] += getattr(slot_value, param_name, 0.0)

        if example_agent:
            quest_items_modifiers = example_agent.profile.get_quest_skill_modifier()

            for skill_name, skill_value in example_agent.profile.iter_skills():
                skill_value = max(0.0, skill_value + quest_items_modifiers.get(skill_name, 0.0))
                for param_name in d.keys():
                    modifier_dict[param_name] += skill_value * getattr(self, '{}_{}'.format(skill_name, param_name), 0.0)

            for perk in example_agent.profile.perks:
                for param_name in modifier_dict.keys():
                    modifier_dict[param_name] += getattr(perk, param_name, 0.0) + getattr(quest_items_modifiers, param_name, 0.0)

            d['v_forward'] *= example_agent.profile.exp_table.get_car_penalty(
                dvalue=(self.needed_driving - example_agent.profile.driving.calc_value())
            )

        # перемножение значений
        for param_name in d.keys():
            # todo: проверить допустимость всех значений
            d[param_name] *= max(modifier_dict[param_name], 0)

        return d

    def ac_max(self, a=None, mobility=None, example_agent=None):
        if a is None:
            a_forward = self.get_modify_value('a_forward', example_agent)
            a_backward = self.get_modify_value('a_backward', example_agent)
            a_braking = self.get_modify_value('a_braking', example_agent)
            a = max(abs(a_forward), abs(a_backward), abs(a_braking))

        if mobility is None:
            mobility = self.get_modify_value('mobility', example_agent)

        return a * 2 * (1.01 + mobility)

    # Для того, чтобы "закрыть" поле
    @property
    def exp(self):
        return self.value_exp

    def get_real_lvl(self):
        if self.exp_table:
            return self.exp_table.car_lvl_by_exp(self.exp)
        log.warn("Not found exp_table for {!r}".format(self))
        return 0

    def set_exp(self, time=None, value=None, dvalue=None):
        assert dvalue is None or dvalue >= 0, 'value_exp={} value={}, dvalue={}'.format(self.value_exp, value, dvalue)
        assert value is None or value >= 0, 'value_exp={} value={}, dvalue={}'.format(self.value_exp, value, dvalue)
        if value is not None:
            self.value_exp = value
        if dvalue is not None:
            self.value_exp += dvalue
        assert self.value_exp >= 0, 'value_exp={} value={}, dvalue={}'.format(self.value_exp, value, dvalue)

    @property
    def frag(self):
        return self.value_frag

    def set_frag(self, value=None, dvalue=None):
        if value is not None:
            self.value_frag = value
        if dvalue is not None:
            self.value_frag += dvalue

    @property
    def way(self):
        return self._way

    def set_way(self, value=None, dvalue=None):
        if value is not None:
            self._way = value
        if dvalue is not None:
            self._way += dvalue

    def is_target(self):
        return False

    def randomize_params(self, options=None):
        """
        Устанавливает значения коэффициентов rand_modifier_*.
        Устанавливает из options или выбирает случайно из rand_range_* диапазона
        """
        for param_name, attr, getter in self.iter_attrs(tags={"param_randomize"}):
            param_range = getattr(self, "rand_range_{}".format(param_name))
            if param_range:
                mod_name = "rand_modifier_{}".format(param_name)
                value = options and options.get(mod_name, None)
                value = value if value is not None and param_range.in_range(value) else param_range.get_random_value()
                setattr(self, mod_name, value)
            else:
                log.warn("randomize_params:: Range not found for {}".format(param_name))

    def pre_buy_car(self, example_agent):
        """
        pre-sale preparation
        Установка параметров-значений state'ов в максимальные значения, зависящие от агентов.
        Выполняется после randomize_params
        """
        self.hp = self.get_modify_value("max_hp", example_agent=example_agent)
        self.fuel = self.get_modify_value("max_fuel", example_agent=example_agent)


class Car(Mobile):
    class QuickPanel(Subdoc):
        qb_1 = RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.item.Item')
        qb_2 = RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.item.Item')
        qb_3 = RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.item.Item')
        qb_4 = RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.item.Item')

    class AudioEngine(Subdoc):
        audio_name = StringField(default="", caption=u'Звук двигателя автомобиля.', tags={'client'})
        min_rate = FloatField(default=0, caption=u'Rate звука при скорости 0 (холостой ход)', tags={'client'})
        max_rate = FloatField(default=0, caption=u'Rate звука при максимальной скорости', tags={'client'})

    quick_panel = EmbeddedDocumentField(document_type=QuickPanel, reinst=True)

    audio_engine = EmbeddedDocumentField(document_type=AudioEngine, reinst=True)

    last_parking_npc = StringField(root_default="", caption=u'Парковщик машины.')

    date_setup_parking = FloatField(root_default=0, caption=u'Дата оставления у парковщика')

    # todo: Написать, что это пути к шаблонам
    armorer_car = StringField(caption=u"Представление машинки у оружейника")
    tuner_car = StringField(caption=u"Представление машинки у тюнера")
    armorer_sectors_svg = StringField(caption=u"Представление секторов машинки у оружейника")
    hangar_car = StringField(caption=u"Представление машинки в ангаре")
    image_scale = StringField(
        caption=u"Масштаб машинки для отрисовки обвеса: small, middle, big",
        root_default="middle", tags={'client'},
    )
    mechanic_engine = StringField(caption=u"Представление двигателя у механника")
    mechanic_transmission = StringField(caption=u"Представление трансмиссии у механника")
    mechanic_brakes = StringField(caption=u"Представление тормозной системы у механника")
    mechanic_cooling = StringField(caption=u"Представление системы охлаждения у механника")
    mechanic_suspension = StringField(caption=u"Представление подвески у механника")

    inv_icon_big = StringField(caption=u'URL глифа (большой разиер) для блоков инвентарей', tags={'client'})
    inv_icon_mid = StringField(caption=u'URL глифа (средний размер) для блоков инвентарей', tags={'client'})
    inv_icon_small = StringField(caption=u'URL глифа (малый размер) для блоков инвентарей', tags={'client'})

    # Атрибуты - слоты механика. Скиданы в кучу, работают по тегам систем
    # Двигатель
    slot_m1 = SlotField(caption=u'M1', doc=u'Двигатель: впуск', tags={'mechanic', 'engine', 'inlet'})
    slot_m2 = SlotField(caption=u'M1', doc=u'Двигатель: компрессор', tags={'mechanic', 'engine', 'compressor'})
    slot_m3 = SlotField(caption=u'M1', doc=u'Двигатель: воздушный фильтр', tags={'mechanic', 'engine', 'air_filter'})
    slot_m4 = SlotField(caption=u'M1', doc=u'Двигатель: распредвал', tags={'mechanic', 'engine', 'camshaft'})
    slot_m5 = SlotField(caption=u'M1', doc=u'Двигатель: зажигание', tags={'mechanic', 'engine', 'ignition'})
    slot_m6 = SlotField(caption=u'M1', doc=u'Двигатель: ГБЦ', tags={'mechanic', 'engine', 'cylinder_head'})
    slot_m7 = SlotField(caption=u'M1', doc=u'Двигатель: ЦПГ', tags={'mechanic', 'engine', 'cylinder_piston'})
    slot_m8 = SlotField(caption=u'M1', doc=u'Двигатель: маховик', tags={'mechanic', 'engine', 'flywheel'})
    slot_m9 = SlotField(caption=u'M1', doc=u'Двигатель: масло', tags={'mechanic', 'engine', 'engine_oil'})
    slot_m10 = SlotField(caption=u'M1', doc=u'Двигатель: выпуск', tags={'mechanic', 'engine', 'exhaust'})

    slot_m11 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m12 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m13 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m14 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m15 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m16 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m17 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m18 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m19 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m20 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m21 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})
    slot_m22 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags={'mechanic', 'engine', 'sparkplug'})

    # Трансмиссия
    slot_m23 = SlotField(caption=u'M1', doc=u'Трансмиссия: сцепление', tags={'mechanic', 'transmission', 'clutch'})
    slot_m24 = SlotField(caption=u'M1', doc=u'Трансмиссия: коробка передач', tags={'mechanic', 'transmission', 'gearbox'})
    slot_m25 = SlotField(caption=u'M1', doc=u'Трансмиссия: полуоси перед', tags={'mechanic', 'transmission', 'front_axle'})
    slot_m26 = SlotField(caption=u'M1', doc=u'Трансмиссия: полуоси зад', tags={'mechanic', 'transmission', 'rear_axle'})
    slot_m27 = SlotField(caption=u'M1', doc=u'Трансмиссия: дифференциал перед', tags={'mechanic', 'transmission', 'front_differential'})
    slot_m28 = SlotField(caption=u'M1', doc=u'Трансмиссия: дифференциал зад', tags={'mechanic', 'transmission', 'rear_differential'})
    slot_m29 = SlotField(caption=u'M1', doc=u'Трансмиссия: трансмиссионное масло', tags={'mechanic', 'transmission', 'ATF'})
    slot_m30 = SlotField(caption=u'M1', doc=u'Трансмиссия: первичный вал', tags={'mechanic', 'transmission', 'primary_shaft'})
    slot_m31 = SlotField(caption=u'M1', doc=u'Трансмиссия: вторичный вал', tags={'mechanic', 'transmission', 'secondary_shaft'})
    slot_m32 = SlotField(caption=u'M1', doc=u'Трансмиссия: гидротрансформатор', tags={'mechanic', 'transmission', 'torque_converter'})
    slot_m33 = SlotField(caption=u'M1', doc=u'Трансмиссия: раздатка', tags={'mechanic', 'transmission', 'transfer_case'})

    # Подвеска
    slot_m34 = SlotField(caption=u'M1', doc=u'Подвеска: передние амортизаторы', tags={'mechanic', 'suspension', 'front_shock_absorber'})
    slot_m35 = SlotField(caption=u'M1', doc=u'Подвеска: передние амортизаторы', tags={'mechanic', 'suspension', 'front_shock_absorber'})
    slot_m36 = SlotField(caption=u'M1', doc=u'Подвеска: задние амортизаторы', tags={'mechanic', 'suspension', 'rear_shock_absorber'})
    slot_m37 = SlotField(caption=u'M1', doc=u'Подвеска: задние амортизаторы', tags={'mechanic', 'suspension', 'rear_shock_absorber'})
    slot_m38 = SlotField(caption=u'M1', doc=u'Подвеска: передние пружины', tags={'mechanic', 'suspension', 'front_coil'})
    slot_m39 = SlotField(caption=u'M1', doc=u'Подвеска: передние пружины', tags={'mechanic', 'suspension', 'front_coil'})
    slot_m40 = SlotField(caption=u'M1', doc=u'Подвеска: задние пружины', tags={'mechanic', 'suspension', 'rear_coil'})
    slot_m41 = SlotField(caption=u'M1', doc=u'Подвеска: задние пружины', tags={'mechanic', 'suspension', 'rear_coil'})
    slot_m42 = SlotField(caption=u'M1', doc=u'Подвеска: передние рычаги', tags={'mechanic', 'suspension', 'front_control_arm'})
    slot_m43 = SlotField(caption=u'M1', doc=u'Подвеска: передние рычаги', tags={'mechanic', 'suspension', 'front_control_arm'})
    slot_m44 = SlotField(caption=u'M1', doc=u'Подвеска: задние рычаги', tags={'mechanic', 'suspension', 'rear_control_arm'})
    slot_m45 = SlotField(caption=u'M1', doc=u'Подвеска: задние рычаги', tags={'mechanic', 'suspension', 'rear_control_arm'})

    slot_m46 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags={'mechanic', 'suspension', 'hub'})
    slot_m47 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags={'mechanic', 'suspension', 'hub'})
    slot_m48 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags={'mechanic', 'suspension', 'hub'})
    slot_m49 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags={'mechanic', 'suspension', 'hub'})
    slot_m50 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags={'mechanic', 'suspension', 'hub'})
    slot_m51 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags={'mechanic', 'suspension', 'hub'})
    slot_m52 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags={'mechanic', 'suspension', 'hub'})
    slot_m53 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags={'mechanic', 'suspension', 'hub'})

    slot_m89 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags={'mechanic', 'suspension', 'wheels'})
    slot_m90 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags={'mechanic', 'suspension', 'wheels'})
    slot_m91 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags={'mechanic', 'suspension', 'wheels'})
    slot_m92 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags={'mechanic', 'suspension', 'wheels'})
    slot_m93 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags={'mechanic', 'suspension', 'wheels'})
    slot_m94 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags={'mechanic', 'suspension', 'wheels'})
    slot_m95 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags={'mechanic', 'suspension', 'wheels'})
    slot_m96 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags={'mechanic', 'suspension', 'wheels'})

    # Тормоза
    slot_m54 = SlotField(caption=u'M1', doc=u'Тормоза: передние тормозные механизмы', tags={'mechanic', 'brakes', 'front_brakes'})
    slot_m55 = SlotField(caption=u'M1', doc=u'Тормоза: передние тормозные механизмы', tags={'mechanic', 'brakes', 'front_brakes'})

    slot_m56 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags={'mechanic', 'brakes', 'rear_brakes'})
    slot_m57 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags={'mechanic', 'brakes', 'rear_brakes'})
    slot_m58 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags={'mechanic', 'brakes', 'rear_brakes'})
    slot_m59 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags={'mechanic', 'brakes', 'rear_brakes'})
    slot_m60 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags={'mechanic', 'brakes', 'rear_brakes'})
    slot_m61 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags={'mechanic', 'brakes', 'rear_brakes'})

    slot_m62 = SlotField(caption=u'M1', doc=u'Тормоза: передние колодки', tags={'mechanic', 'brakes', 'front_brake_pads'})
    slot_m63 = SlotField(caption=u'M1', doc=u'Тормоза: передние колодки', tags={'mechanic', 'brakes', 'front_brake_pads'})

    slot_m64 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags={'mechanic', 'brakes', 'rear_brake_pads'})
    slot_m65 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags={'mechanic', 'brakes', 'rear_brake_pads'})
    slot_m66 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags={'mechanic', 'brakes', 'rear_brake_pads'})
    slot_m67 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags={'mechanic', 'brakes', 'rear_brake_pads'})
    slot_m68 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags={'mechanic', 'brakes', 'rear_brake_pads'})
    slot_m69 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags={'mechanic', 'brakes', 'rear_brake_pads'})

    slot_m70 = SlotField(caption=u'M1', doc=u'Тормоза: усилитель тормозов', tags={'mechanic', 'brakes', 'booster'})

    slot_m71 = SlotField(caption=u'M1', doc=u'Тормоза: АБС', tags={'mechanic', 'brakes', 'abs'})

    slot_m72 = SlotField(caption=u'M1', doc=u'Тормоза: шланги перед', tags={'mechanic', 'brakes', 'front_brake_lines'})
    slot_m73 = SlotField(caption=u'M1', doc=u'Тормоза: шланги перед', tags={'mechanic', 'brakes', 'front_brake_lines'})

    slot_m74 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags={'mechanic', 'brakes', 'rear_brake_lines'})
    slot_m75 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags={'mechanic', 'brakes', 'rear_brake_lines'})
    slot_m76 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags={'mechanic', 'brakes', 'rear_brake_lines'})
    slot_m77 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags={'mechanic', 'brakes', 'rear_brake_lines'})
    slot_m78 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags={'mechanic', 'brakes', 'rear_brake_lines'})
    slot_m79 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags={'mechanic', 'brakes', 'rear_brake_lines'})

    slot_m80 = SlotField(caption=u'M1', doc=u'Тормоза: тормозная жидкость', tags={'mechanic', 'brakes', 'brake_fluid'})

    # Охлаждение
    slot_m81 = SlotField(caption=u'M1', doc=u'Охлаждение: радиатор', tags={'mechanic', 'cooling', 'radiator'})
    slot_m82 = SlotField(caption=u'M1', doc=u'Охлаждение: помпа', tags={'mechanic', 'cooling', 'pump'})
    slot_m83 = SlotField(caption=u'M1', doc=u'Охлаждение: охлаждающая жидкость', tags={'mechanic', 'cooling', 'coolant'})
    slot_m84 = SlotField(caption=u'M1', doc=u'Охлаждение: дополнительный радиатор', tags={'mechanic', 'cooling', 'add_radiator'})
    slot_m85 = SlotField(caption=u'M1', doc=u'Охлаждение: термостат', tags={'mechanic', 'cooling', 'thermostat'})

    slot_m86 = SlotField(caption=u'M1', doc=u'Охлаждение: вентилятор', tags={'mechanic', 'cooling', 'fan'})
    slot_m87 = SlotField(caption=u'M1', doc=u'Охлаждение: вентилятор', tags={'mechanic', 'cooling', 'fan'})
    slot_m88 = SlotField(caption=u'M1', doc=u'Охлаждение: вентилятор', tags={'mechanic', 'cooling', 'fan'})

    # Слоты стилиста
    slot_t1 = SlotField(caption=u't2', doc=u'Слот тюнера задний бампер', tags={'tuner', 'wheels'})
    slot_t2 = SlotField(caption=u't2', doc=u'Слот тюнера заднее крыло', tags={'tuner', 'b_fender'})
    slot_t3 = SlotField(caption=u't3', doc=u'Слот тюнера glass', tags={'tuner', 'glass'})
    slot_t4 = SlotField(caption=u't1', doc=u'Слот тюнера передний бампер', tags={'tuner', 'f_bumper'})
    slot_t5 = SlotField(caption=u't2', doc=u'Слот тюнера переднее крыло', tags={'tuner', 'f_fender'})
    slot_t6 = SlotField(caption=u't3', doc=u'Слот тюнера спойлер', tags={'tuner', 'f_glass'})
    slot_t7 = SlotField(caption=u't1', doc=u'Слот тюнера крыша', tags={'tuner', 'roof'})
    slot_t8 = SlotField(caption=u't2', doc=u'Слот тюнера задний бампер', tags={'tuner', 'skirt'})
    slot_t9 = SlotField(caption=u't1', doc=u'Слот тюнера задний бампер', tags={'tuner', 'b_bumper'})

    slot_t10 = SlotField(caption=u't1', doc=u'Слот тюнера воздухозаборник', tags={'tuner', 'airint'})
    slot_t11 = SlotField(caption=u't1', doc=u'Слот тюнера броня', tags={'tuner', 'armor'})
    slot_t12 = SlotField(caption=u't1', doc=u'Слот тюнера баул', tags={'tuner', 'bale'})
    slot_t13 = SlotField(caption=u't1', doc=u'Слот тюнера шноркель', tags={'tuner', 'shnork'})
    slot_t14 = SlotField(caption=u't1', doc=u'Слот тюнера ступенька', tags={'tuner', 'step'})
    slot_t15 = SlotField(caption=u't1', doc=u'Слот тюнера доп. багажник', tags={'tuner', 'trunk'})
    slot_t16 = SlotField(caption=u't1', doc=u'Слот тюнера козырек', tags={'tuner', 'visor'})
    slot_t17 = SlotField(caption=u't1', doc=u'Слот тюнера защита стёкол', tags={'tuner', 'win_prot'})


class Drone(Mobile):
    pass


class ExtraMobile(Mobile):
    life_time = FloatField(caption=u"Время жизни объекта")
    can_attack = BooleanField(root_default=True, caption=u'Нужно ли городу агриться на объект')

    def is_target(self):  # Является ли данный объект целью для атаки кого-либо
        return self.can_attack


class MapRadar(ExtraMobile):pass
class MapWeaponTurret(ExtraMobile):pass


class MapWeaponEffectMine(ExtraMobile):
    # todo: заменить имена эффектов на URI
    effects = ListField(
        caption=u'Эффекты', doc=u'Список эффектов (URI) накладываемых миной',
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.effects.Effect'),
    )


class MapBangWeapon(ExtraMobile):
    radius_damage = FloatField(caption=u"Радиус взрыва ракеты")
    damage = FloatField(caption=u"Дамаг в радиусе взрыва")


class MapWeaponRocket(MapBangWeapon):
    icon_name = StringField(caption=u'Имя иконки в iconManager')


class MapWeaponBangMine(MapBangWeapon):
    pass



