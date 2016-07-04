  # -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute, Position, Parameter, FloatAttribute, TextAttribute
from sublayers_server.model.registry.attr.link import Slot
from sublayers_server.model.registry.attr.inv import InventoryAttribute
from sublayers_server.model.registry.classes.weapons import Weapon  # todo: осторожно с рекуррентным импортом
from sublayers_server.model.registry.classes.item import SlotLock, MechanicItem  # tpodo: перенести к описанию слота

from sublayers_server.model.registry.attr.link import RegistryLink

from math import pi


class Mobile(Root):
    # атрибуты от PointObject
    position = Position(caption=u"Последние координаты объекта")

    # Последняя посещенная локация
    last_location = RegistryLink(caption=u'Последняя посещенная локация')

    # атрибуты от ObserverObjects
    p_observing_range = Parameter(default=1000, caption=u"Радиус обзора")

    # атрибуты от VisibleObjects
    p_vigilance = Parameter(default=0, caption=u"Коэффициент зоркости")
    p_visibility_min = Parameter(default=1, caption=u"Минимальный коэффициент заметности")
    p_visibility_max = Parameter(default=1, caption=u"Максимальный коэффициент заметности")
    p_obs_range_rate_min = Parameter(default=1, caption=u"Коэффициент радиуса обзора при максимальной скорости")
    p_obs_range_rate_max = Parameter(default=1, caption=u"Коэффициент радиуса обзора при скорости = 0")

    # Модификаторы эффектов зон
    m_cc_dirt = Parameter(default=0.2, caption=u"Модификатор CC на бездорожье", tags='parameter p_modifier')
    m_cc_wood = Parameter(default=0.3, caption=u"Модификатор CC в лесу", tags='parameter p_modifier')
    m_visibility_wood = Parameter(default=0.5, caption=u"Модификатор видимости в лесу", tags='parameter p_modifier')
    m_observing_range_wood = Parameter(default=0.5, caption=u"Модификатор обзора в лесу", tags='parameter p_modifier')
    m_cc_slope = Parameter(default=0.2, caption=u"Модификатор CC в горах", tags='parameter p_modifier')
    m_cc_water = Parameter(default=0.45, caption=u"Модификатор CC на воде", tags='parameter p_modifier')
    m_r_cc_wood_on_road = Parameter(default=1.0, caption=u"Модификатор резиста штрафа СС в лесу на дороге", tags='parameter p_modifier')
    m_r_cc_water_on_road = Parameter(default=1.0, caption=u"Модификатор резиста штрафа СС в воде на дороге ", tags='parameter p_modifier')
    m_r_cc_dirt_on_road = Parameter(default=1.0, caption=u"Модификатор резиста штрафа СС на бездорожье на дороге", tags='parameter p_modifier')
    m_r_cc_slope_on_road = Parameter(default=1.0, caption=u"Модификатор резиста штрафа СС в горах на дороге ", tags='parameter p_modifier')
    m_r_cc_dirt = Parameter(default=1.0, caption=u"Модификатор резиста бездорожья для отмены бездорожья", tags='parameter p_modifier')
    m_cc_mine = Parameter(default=0.5, caption=u"Модификатор CC замедляющей мины", tags='parameter p_modifier')
    m_cc_fuel_empty = Parameter(default=0.9, caption=u"Модификатор CC при пустом баке", tags='parameter p_modifier')

    # Резисты к модификаторам эффетов зон
    r_empty = Parameter(default=0.0, caption=u"Пустой резист", tags='parameter p_resist')
    r_cc_dirt = Parameter(default=0.0, caption=u"Резист к модификатору CC на бездорожье", tags='parameter p_resist')
    r_cc_wood = Parameter(default=0.0, caption=u"Резист к модификатору CC в лесу", tags='parameter p_resist')
    r_visibility_wood = Parameter(default=0.0, caption=u"Резист к модификатору видимости в лесу", tags='parameter p_resist')
    r_observing_range_wood = Parameter(default=0.0, caption=u"Резист к модификатору обзора в лесу", tags='parameter p_resist')
    r_cc_slope = Parameter(default=0.0, caption=u"Резист к модификатору CC в горах", tags='parameter p_resist')
    r_cc_water = Parameter(default=0.0, caption=u"Резист к модификатору CC в воде", tags='parameter p_resist')
    r_cc_mine = Parameter(default=0.0, caption=u"Резист к модификатору CC замедляющей мины", tags='parameter p_resist')
    r_cc_fuel_empty = Parameter(default=0.0, caption=u"Резист к модификатору CC при пустом баке", tags='parameter p_resist')

    # атрибуты от Unit
    p_defence = Parameter(default=1, caption=u"Броня")
    max_hp = FloatAttribute(caption=u"Максимальное значение HP", tags='client')
    hp = FloatAttribute(caption=u"Текущее значение HP", tags='client')
    direction = FloatAttribute(default=-pi/2, caption=u"Текущее направление машины")

    # атрибуты Mobile
    r_min = FloatAttribute(default=10, caption=u"Минимальный радиус разворота")
    ac_max = FloatAttribute(default=14, caption=u"Максимальная перегрузка при развороте")
    max_control_speed = FloatAttribute(default=28, caption=u"Абсолютная максимальная скорость движения")
    v_forward = FloatAttribute(default=20, caption=u"Максимальная скорость движения вперед")
    v_backward = FloatAttribute(default=-10, caption=u"Максимальная скорость движения назад")
    a_forward = FloatAttribute(default=5, caption=u"Ускорение разгона вперед")
    a_backward = FloatAttribute(default=-3, caption=u"Ускорение разгона назад")
    a_braking = FloatAttribute(default=-6, caption=u"Ускорение торможения")

    max_fuel = FloatAttribute(default=100, caption=u"Максимальное количество топлива", tags="client")
    fuel = FloatAttribute(default=100, caption=u"Текущее количество топлива", tags="client")
    p_fuel_rate = FloatAttribute(default=0.5, caption=u"Расход топлива (л/с)")

    # атрибуты влияющие на эффективность стрельбы
    dps_rate = FloatAttribute(default=1.0, caption=u"Множитель модификации урона автоматического оружия")
    damage_rate = FloatAttribute(default=1.0, caption=u"Множитель модификации урона залпового оружия")
    time_recharge_rate = FloatAttribute(default=1.0, caption=u"Множитель модификации времени перезарядки залпового оружия")
    radius_rate = FloatAttribute(default=1.0, caption=u"Множитель модификации дальности стрельбы")

    # атрибуты, отвечающие за авто-ремонт машины.
    repair_rate = FloatAttribute(default=0, caption=u"Скорость отхила в секунду")
    repair_rate_on_stay = FloatAttribute(default=0, caption=u"Дополнительная скорость отхила в стоячем положении")

    # атрибуты, связанные с критами.
    crit_rate = FloatAttribute(default=0.5, caption=u"Шанс крита [0 .. сколько угодно, но больше 1 нет смысла]")
    crit_power = FloatAttribute(default=0.5, caption=u"Сила крита [0 .. сколько угодно]")

    slot_FL = Slot(caption=u'ForwardLeftSlot', doc=u'Передний левый слот', tags='armorer')
    slot_FL_f = TextAttribute(default='FL_0', caption=u'Флаги переднего левого слота [FBLR]', tags='client slot_limit')
    slot_CL = Slot(caption=u'LeftSlot', doc=u'Центральный левый слот', tags='armorer')
    slot_CL_f = TextAttribute(default='FBL_0', caption=u'Флаги центрального левого слота [FBLR]', tags='client slot_limit')
    slot_BL = Slot(caption=u'BackwardLeftSlot', doc=u'Задний левый слот', tags='armorer')
    slot_BL_f = TextAttribute(default='BL_0', caption=u'Флаги залнего левого слота [FBLR]', tags='client slot_limit')

    slot_FC = Slot(caption=u'ForwardSlot', doc=u'Передний средний слот', tags='armorer')
    slot_FC_f = TextAttribute(default='FLR_0', caption=u'Флаги переднего среднего слота [FBLR]', tags='client slot_limit')
    slot_CC = Slot(caption=u'CentralSlot', doc=u'Центральный средний слот', tags='armorer')
    slot_CC_f = TextAttribute(default='FBLR_0', caption=u'Флаги центрального среднего слота [FBLR]', tags='client slot_limit')
    slot_BC = Slot(caption=u'BackwardSlot', doc=u'Задний средний слот', tags='armorer')
    slot_BC_f = TextAttribute(default='BLR_0', caption=u'Флаги заднего среднего слота [FBLR]', tags='client slot_limit')

    slot_FR = Slot(caption=u'ForwardRightSlot', doc=u'Передний правый слот', tags='armorer')
    slot_FR_f = TextAttribute(default='FR_0', caption=u'Флаги переднего правого слота [FBLR]', tags='client slot_limit')
    slot_CR = Slot(caption=u'RightSlot', doc=u'Центральный правый слот', tags='armorer')
    slot_CR_f = TextAttribute(default='FBR_0', caption=u'Флаги центрального правого слота [FBLR]', tags='client slot_limit')
    slot_BR = Slot(caption=u'BackwardRightSlot', doc=u'Задний правый слот', tags='armorer')
    slot_BR_f = TextAttribute(default='BR_0', caption=u'Флаги заднего правого слота [FBLR]', tags='client slot_limit')

    inventory = InventoryAttribute(caption=u'Инвентарь', doc=u'Список предметов в инвентаре ТС')
    inventory_size = Attribute(default=10, caption=u"Размер инвентаря")

    # todo: реализовать предынициализацию инвентаря абстрактным в конструкторе
    price = Attribute(default=0, caption=u"Цена", tags='client')

    # Косметика
    title = Attribute(default="", caption=u"Модель автомобиля", tags='client')
    class_car = Attribute(default="", caption=u"Класс автомобиля", tags='client')
    sub_class_car = Attribute(default="", caption=u"Подкласс автомобиля", tags='client')
    name_car = Attribute(default="", caption=u"Название автомобиля", tags='client')

    # Влияние скилов
    driving_r_min = FloatAttribute(default=0.0, caption=u"Влияние Вождения на Минимальный радиус разворота")
    driving_ac_max = FloatAttribute(default=0.0, caption=u"Влияние Вождения на Максимальную перегрузка при развороте")
    driving_max_control_speed = FloatAttribute(default=0.0, caption=u"Влияние Вождения на Абсолютную максимальную скорость движения")
    driving_v_forward = FloatAttribute(default=0.0, caption=u"Влияние Вождения на Максимальную скорость движения вперед")
    driving_v_backward = FloatAttribute(default=0.0, caption=u"Влияние Вождения на Максимальную скорость движения назад")
    driving_a_forward = FloatAttribute(default=0.0, caption=u"Влияние Вождения на Ускорение разгона вперед")
    driving_a_backward = FloatAttribute(default=0.0, caption=u"Влияние Вождения на Ускорение разгона назад")
    driving_a_braking = FloatAttribute(default=0.0, caption=u"Влияние Вождения на Ускорение торможения")

    shooting_dps_rate = FloatAttribute(default=0.0, caption=u"Влияние Стрельбы на Множитель модификации урона автоматического оружия")
    shooting_damage_rate = FloatAttribute(default=0.0, caption=u"Влияние Стрельбы на Множитель модификации урона залпового оружия")
    shooting_time_recharge_rate = FloatAttribute(default=0.0, caption=u"Влияние Стрельбы на Множитель модификации времени перезарядки залпового оружия")
    shooting_radius_rate = FloatAttribute(default=0.0, caption=u"Влияние Стрельбы на Множитель модификации дальности стрельбы")

    masking_p_visibility = FloatAttribute(default=0.0, caption=u"Влияние Маскировки на Коэффициент заметности")

    exp_table = RegistryLink(caption=u"Таблица опыта")

    def iter_weapons(self):
        return (v for attr, v in self.iter_slots(tags='armorer') if isinstance(v, Weapon))

    def iter_slots(self, tags=None):
        for attr, getter in self.iter_attrs(tags=tags, classes=Slot):
            v = getter()
            if not isinstance(v, SlotLock) and v is not False:  # todo: SlotLock
                yield attr.name, v

    def iter_slots2(self, tags=None):
        for attr, getter in self.iter_attrs(tags=tags, classes=Slot):
            v = getter()
            if not isinstance(v, SlotLock) and v is not False:  # todo: SlotLock
                yield attr.name, v, attr

    def get_count_slots(self, tags=None):
        result = 0
        for attr, getter in self.iter_attrs(tags=tags, classes=Slot):
            v = getter()
            if not isinstance(v, SlotLock) and v is not False:
                result += 1
        return result

    def get_modify_value(self, param_name, example_agent=None):
        original_value = getattr(self, param_name)

        mechanic_slots_effect = 0
        for slot_name, slot_value in self.iter_slots(tags='mechanic'):
            if isinstance(slot_value, MechanicItem):
                mechanic_slots_effect += getattr(slot_value, param_name, 0.0)

        agent_effect = 0
        if example_agent:
            for skill_name, skill_value in example_agent.iter_skills():
                agent_effect += skill_value * getattr(self, '{}_{}'.format(skill_name, param_name), 0.0)
            for perk in example_agent.perks:
                agent_effect += getattr(perk, param_name, 0.0)

        # todo: проверить допустимость значения
        assert original_value is not None, '{} is not allowed {}'.format(param_name, original_value)
        return original_value + mechanic_slots_effect + agent_effect


class Car(Mobile):
    last_parking_npc = RegistryLink(default=None, caption=u'Парковщик машины.')
    date_setup_parking = FloatAttribute(default=0, caption=u'Дата оставления у парковщика')

    armorer_car = Attribute(caption=u"Представление машинки у оружейника")
    tuner_car = Attribute(caption=u"Представление машинки у тюнера")
    armorer_sectors_svg = Attribute(caption=u"Представление секторов машинки у оружейника")
    hangar_car = Attribute(caption=u"Представление машинки в ангаре")
    image_scale = Attribute(default="middle", caption=u"Масштаб машинки для отрисовки обвеса: small, middle, big", tags="client")

    mechanic_engine = Attribute(caption=u"Представление двигателя у механника")
    mechanic_transmission = Attribute(caption=u"Представление трансмиссии у механника")
    mechanic_brakes = Attribute(caption=u"Представление тормозной системы у механника")
    mechanic_cooling = Attribute(caption=u"Представление системы охлаждения у механника")
    mechanic_suspension = Attribute(caption=u"Представление подвески у механника")

    inv_icon_big = Attribute(caption=u'URL глифа (большой разиер) для блоков инвентарей', tags="client")
    inv_icon_mid = Attribute(caption=u'URL глифа (средний размер) для блоков инвентарей', tags="client")
    inv_icon_small = Attribute(caption=u'URL глифа (малый размер) для блоков инвентарей', tags="client")

    # Атрибуты - слоты механика. Скиданы в кучу, работают по тегам систем
    # Двигатель
    slot_m1 = Slot(caption=u'M1', doc=u'Двигатель: впуск', tags='mechanic engine inlet')
    slot_m2 = Slot(caption=u'M1', doc=u'Двигатель: компрессор', tags='mechanic engine compressor')
    slot_m3 = Slot(caption=u'M1', doc=u'Двигатель: воздушный фильтр', tags='mechanic engine air_filter')
    slot_m4 = Slot(caption=u'M1', doc=u'Двигатель: распредвал', tags='mechanic engine camshaft')
    slot_m5 = Slot(caption=u'M1', doc=u'Двигатель: зажигание', tags='mechanic engine ignition')
    slot_m6 = Slot(caption=u'M1', doc=u'Двигатель: ГБЦ', tags='mechanic engine cylinder_head')
    slot_m7 = Slot(caption=u'M1', doc=u'Двигатель: ЦПГ', tags='mechanic engine cylinder_piston')
    slot_m8 = Slot(caption=u'M1', doc=u'Двигатель: маховик', tags='mechanic engine flywheel')
    slot_m9 = Slot(caption=u'M1', doc=u'Двигатель: масло', tags='mechanic engine engine_oil')
    slot_m10 = Slot(caption=u'M1', doc=u'Двигатель: выпуск', tags='mechanic engine exhaust')

    slot_m11 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m12 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m13 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m14 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m15 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m16 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m17 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m18 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m19 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m20 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m21 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m22 = Slot(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')

    # Трансмиссия
    slot_m23 = Slot(caption=u'M1', doc=u'Трансмиссия: сцепление', tags='mechanic transmission clutch')
    slot_m24 = Slot(caption=u'M1', doc=u'Трансмиссия: коробка передач', tags='mechanic transmission gearbox')
    slot_m25 = Slot(caption=u'M1', doc=u'Трансмиссия: полуоси перед', tags='mechanic transmission front_axle')
    slot_m26 = Slot(caption=u'M1', doc=u'Трансмиссия: полуоси зад', tags='mechanic transmission rear_axle')
    slot_m27 = Slot(caption=u'M1', doc=u'Трансмиссия: дифференциал перед', tags='mechanic transmission front_differential')
    slot_m28 = Slot(caption=u'M1', doc=u'Трансмиссия: дифференциал зад', tags='mechanic transmission rear_differential')
    slot_m29 = Slot(caption=u'M1', doc=u'Трансмиссия: трансмиссионное масло', tags='mechanic transmission ATF')
    slot_m30 = Slot(caption=u'M1', doc=u'Трансмиссия: первичный вал', tags='mechanic transmission primary_shaft')
    slot_m31 = Slot(caption=u'M1', doc=u'Трансмиссия: вторичный вал', tags='mechanic transmission secondary_shaft')
    slot_m32 = Slot(caption=u'M1', doc=u'Трансмиссия: гидротрансформатор', tags='mechanic transmission torque_converter')
    slot_m33 = Slot(caption=u'M1', doc=u'Трансмиссия: раздатка', tags='mechanic transmission transfer_case')

    # Подвеска
    slot_m34 = Slot(caption=u'M1', doc=u'Подвеска: передние амортизаторы', tags='mechanic suspension front_shock_absorber')
    slot_m35 = Slot(caption=u'M1', doc=u'Подвеска: передние амортизаторы', tags='mechanic suspension front_shock_absorber')
    slot_m36 = Slot(caption=u'M1', doc=u'Подвеска: задние амортизаторы', tags='mechanic suspension rear_shock_absorber')
    slot_m37 = Slot(caption=u'M1', doc=u'Подвеска: задние амортизаторы', tags='mechanic suspension rear_shock_absorber')
    slot_m38 = Slot(caption=u'M1', doc=u'Подвеска: передние пружины', tags='mechanic suspension front_coil')
    slot_m39 = Slot(caption=u'M1', doc=u'Подвеска: передние пружины', tags='mechanic suspension front_coil')
    slot_m40 = Slot(caption=u'M1', doc=u'Подвеска: задние пружины', tags='mechanic suspension rear_coil')
    slot_m41 = Slot(caption=u'M1', doc=u'Подвеска: задние пружины', tags='mechanic suspension rear_coil')
    slot_m42 = Slot(caption=u'M1', doc=u'Подвеска: передние рычаги', tags='mechanic suspension front_control_arm')
    slot_m43 = Slot(caption=u'M1', doc=u'Подвеска: передние рычаги', tags='mechanic suspension front_control_arm')
    slot_m44 = Slot(caption=u'M1', doc=u'Подвеска: задние рычаги', tags='mechanic suspension rear_control_arm')
    slot_m45 = Slot(caption=u'M1', doc=u'Подвеска: задние рычаги', tags='mechanic suspension rear_control_arm')

    slot_m46 = Slot(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m47 = Slot(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m48 = Slot(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m49 = Slot(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m50 = Slot(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m51 = Slot(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m52 = Slot(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m53 = Slot(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')

    slot_m89 = Slot(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m90 = Slot(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m91 = Slot(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m92 = Slot(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m93 = Slot(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m94 = Slot(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m95 = Slot(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m96 = Slot(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')

    # Тормоза
    slot_m54 = Slot(caption=u'M1', doc=u'Тормоза: передние тормозные механизмы', tags='mechanic brakes front_brakes')
    slot_m55 = Slot(caption=u'M1', doc=u'Тормоза: передние тормозные механизмы', tags='mechanic brakes front_brakes')

    slot_m56 = Slot(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m57 = Slot(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m58 = Slot(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m59 = Slot(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m60 = Slot(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m61 = Slot(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')

    slot_m62 = Slot(caption=u'M1', doc=u'Тормоза: передние колодки', tags='mechanic brakes front_brake_pads')
    slot_m63 = Slot(caption=u'M1', doc=u'Тормоза: передние колодки', tags='mechanic brakes front_brake_pads')

    slot_m64 = Slot(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m65 = Slot(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m66 = Slot(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m67 = Slot(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m68 = Slot(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m69 = Slot(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')

    slot_m70 = Slot(caption=u'M1', doc=u'Тормоза: усилитель тормозов', tags='mechanic brakes booster')

    slot_m71 = Slot(caption=u'M1', doc=u'Тормоза: АБС', tags='mechanic brakes abs')

    slot_m72 = Slot(caption=u'M1', doc=u'Тормоза: шланги перед', tags='mechanic brakes front_brake_lines')
    slot_m73 = Slot(caption=u'M1', doc=u'Тормоза: шланги перед', tags='mechanic brakes front_brake_lines')

    slot_m74 = Slot(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m75 = Slot(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m76 = Slot(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m77 = Slot(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m78 = Slot(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m79 = Slot(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')

    slot_m80 = Slot(caption=u'M1', doc=u'Тормоза: тормозная жидкость', tags='mechanic brakes brake_fluid')

    # Охлаждение
    slot_m81 = Slot(caption=u'M1', doc=u'Охлаждение: радиатор', tags='mechanic cooling radiator')
    slot_m82 = Slot(caption=u'M1', doc=u'Охлаждение: помпа', tags='mechanic cooling pump')
    slot_m83 = Slot(caption=u'M1', doc=u'Охлаждение: охлаждающая жидкость', tags='mechanic cooling coolant')
    slot_m84 = Slot(caption=u'M1', doc=u'Охлаждение: дополнительный радиатор', tags='mechanic cooling add_radiator')
    slot_m85 = Slot(caption=u'M1', doc=u'Охлаждение: термостат', tags='mechanic cooling thermostat')

    slot_m86 = Slot(caption=u'M1', doc=u'Охлаждение: вентилятор', tags='mechanic cooling fan')
    slot_m87 = Slot(caption=u'M1', doc=u'Охлаждение: вентилятор', tags='mechanic cooling fan')
    slot_m88 = Slot(caption=u'M1', doc=u'Охлаждение: вентилятор', tags='mechanic cooling fan')

    slot_t1 = Slot(caption=u't2', doc=u'Слот тюнера задний бампер', tags='tuner wheels')
    slot_t2 = Slot(caption=u't2', doc=u'Слот тюнера заднее крыло', tags='tuner b_fender')
    slot_t3 = Slot(caption=u't3', doc=u'Слот тюнера спойлер', tags='tuner b_glass')
    slot_t4 = Slot(caption=u't1', doc=u'Слот тюнера передний бампер', tags='tuner f_bumper')
    slot_t5 = Slot(caption=u't2', doc=u'Слот тюнера переднее крыло', tags='tuner f_fender')
    slot_t6 = Slot(caption=u't3', doc=u'Слот тюнера спойлер', tags='tuner f_glass')
    slot_t7 = Slot(caption=u't1', doc=u'Слот тюнера крыша', tags='tuner roof')
    slot_t8 = Slot(caption=u't2', doc=u'Слот тюнера задний бампер', tags='tuner skirt')
    slot_t9 = Slot(caption=u't1', doc=u'Слот тюнера задний бампер', tags='tuner b_bumper')

    slot_t10 = Slot(caption=u't1', doc=u'Слот тюнера воздухозаборник', tags='tuner airint')
    slot_t11 = Slot(caption=u't1', doc=u'Слот тюнера броня', tags='tuner armor')
    slot_t12 = Slot(caption=u't1', doc=u'Слот тюнера баул', tags='tuner bale')
    slot_t13 = Slot(caption=u't1', doc=u'Слот тюнера шноркель', tags='tuner shnork')
    slot_t14 = Slot(caption=u't1', doc=u'Слот тюнера ступенька', tags='tuner step')
    slot_t15 = Slot(caption=u't1', doc=u'Слот тюнера доп.багажник', tags='tuner trunk')
    slot_t16 = Slot(caption=u't1', doc=u'Слот тюнера козырек', tags='tuner visor')
    slot_t17 = Slot(caption=u't1', doc=u'Слот тюнера защита стёкол', tags='tuner win_prot')


class Drone(Mobile):
    pass


class MobileWeapon(Mobile):
    pass


class MapWeaponEffectMine(MobileWeapon):
    effects = Attribute(default=(), caption=u'Список эффектов (URI) накладываемых миной')


class MapWeaponRocket(MobileWeapon):
    radius_damage = FloatAttribute(default=30.0, caption=u"Радиус взрыва ракеты")
    damage = FloatAttribute(default=30.0, caption=u"Дамаг в радиусе взрыва")
    life_time = FloatAttribute(default=10.0, caption=u"Время жизни ракеты")


