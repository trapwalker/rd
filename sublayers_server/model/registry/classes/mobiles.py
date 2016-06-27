# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.classes.weapons import Weapon  # todo: осторожно с рекуррентным импортом
from sublayers_server.model.registry.classes.item import SlotLock, MechanicItem  # tpodo: перенести к описанию слота
from sublayers_server.model.registry.classes.inventory import InventoryField
from sublayers_server.model.registry.odm_position import PositionField
from sublayers_server.model.registry.odm.fields import (
    IntField, StringField, FloatField, UniReferenceField, EmbeddedDocumentField,
)

from math import pi


class SlotField(EmbeddedDocumentField):
    LOCK_URI = "reg://registry/items/slot_item/slot_lock"

    def __init__(self, embedded_document_type='sublayers_server.model.registry.classes.item.SlotItem', *av, **kw):
        super(SlotField, self).__init__(embedded_document_type=embedded_document_type, *av, **kw)


class Mobile(Root):
    # атрибуты от PointObject
    position = PositionField(caption=u"Последние координаты объекта")

    # Последняя посещенная локация
    last_location = UniReferenceField(caption=u'Последняя посещенная локация')

    # атрибуты от ObserverObjects
    p_observing_range = FloatField(default=1000, caption=u"Радиус обзора", tags="parameter")

    # атрибуты от VisibleObjects
    p_vigilance = FloatField(default=0, caption=u"Коэффициент зоркости", tags="parameter")
    p_visibility_min = FloatField(default=1, caption=u"Минимальный коэффициент заметности", tags="parameter")
    p_visibility_max = FloatField(default=1, caption=u"Максимальный коэффициент заметности", tags="parameter")
    p_obs_range_rate_min = FloatField(default=1, caption=u"Коэффициент радиуса обзора при максимальной скорости", tags="parameter")
    p_obs_range_rate_max = FloatField(default=1, caption=u"Коэффициент радиуса обзора при скорости = 0", tags="parameter")

    # Модификаторы эффектов зон
    m_cc_dirt = FloatField(default=0.2, caption=u"Модификатор CC на бездорожье", tags='parameter p_modifier')
    m_cc_wood = FloatField(default=0.3, caption=u"Модификатор CC в лесу", tags='parameter p_modifier')
    m_visibility_wood = FloatField(default=0.5, caption=u"Модификатор видимости в лесу", tags='parameter p_modifier')
    m_observing_range_wood = FloatField(default=0.5, caption=u"Модификатор обзора в лесу", tags='parameter p_modifier')
    m_cc_slope = FloatField(default=0.2, caption=u"Модификатор CC в горах", tags='parameter p_modifier')
    m_cc_water = FloatField(default=0.45, caption=u"Модификатор CC на воде", tags='parameter p_modifier')
    m_r_cc_wood_on_road = FloatField(default=1.0, caption=u"Модификатор резиста штрафа СС в лесу на дороге", tags='parameter p_modifier')
    m_r_cc_water_on_road = FloatField(default=1.0, caption=u"Модификатор резиста штрафа СС в воде на дороге ", tags='parameter p_modifier')
    m_r_cc_dirt_on_road = FloatField(default=1.0, caption=u"Модификатор резиста штрафа СС на бездорожье на дороге", tags='parameter p_modifier')
    m_r_cc_slope_on_road = FloatField(default=1.0, caption=u"Модификатор резиста штрафа СС в горах на дороге ", tags='parameter p_modifier')
    m_r_cc_dirt = FloatField(default=1.0, caption=u"Модификатор резиста бездорожья для отмены бездорожья", tags='parameter p_modifier')
    m_cc_mine = FloatField(default=0.5, caption=u"Модификатор CC замедляющей мины", tags='parameter p_modifier')
    m_cc_fuel_empty = FloatField(default=0.9, caption=u"Модификатор CC при пустом баке", tags='parameter p_modifier')

    # Резисты к модификаторам эффетов зон
    r_empty = FloatField(default=0.0, caption=u"Пустой резист", tags='parameter p_resist')
    r_cc_dirt = FloatField(default=0.0, caption=u"Резист к модификатору CC на бездорожье", tags='parameter p_resist')
    r_cc_wood = FloatField(default=0.0, caption=u"Резист к модификатору CC в лесу", tags='parameter p_resist')
    r_visibility_wood = FloatField(default=0.0, caption=u"Резист к модификатору видимости в лесу", tags='parameter p_resist')
    r_observing_range_wood = FloatField(default=0.0, caption=u"Резист к модификатору обзора в лесу", tags='parameter p_resist')
    r_cc_slope = FloatField(default=0.0, caption=u"Резист к модификатору CC в горах", tags='parameter p_resist')
    r_cc_water = FloatField(default=0.0, caption=u"Резист к модификатору CC в воде", tags='parameter p_resist')
    r_cc_mine = FloatField(default=0.0, caption=u"Резист к модификатору CC замедляющей мины", tags='parameter p_resist')
    r_cc_fuel_empty = FloatField(default=0.0, caption=u"Резист к модификатору CC при пустом баке", tags='parameter p_resist')

    # атрибуты от Unit
    p_defence = FloatField(default=1, caption=u"Броня", tags='parameter')
    max_hp = FloatField(caption=u"Максимальное значение HP", tags='client')
    hp = FloatField(caption=u"Текущее значение HP", tags='client')
    direction = FloatField(default=-pi/2, caption=u"Текущее направление машины")

    # атрибуты Mobile
    r_min = FloatField(default=10, caption=u"Минимальный радиус разворота")
    ac_max = FloatField(default=14, caption=u"Максимальная перегрузка при развороте")
    max_control_speed = FloatField(default=28, caption=u"Абсолютная максимальная скорость движения")
    v_forward = FloatField(default=20, caption=u"Максимальная скорость движения вперед")
    v_backward = FloatField(default=-10, caption=u"Максимальная скорость движения назад")
    a_forward = FloatField(default=5, caption=u"Ускорение разгона вперед")
    a_backward = FloatField(default=-3, caption=u"Ускорение разгона назад")
    a_braking = FloatField(default=-6, caption=u"Ускорение торможения")

    max_fuel = FloatField(default=100, caption=u"Максимальное количество топлива", tags="client")
    fuel = FloatField(default=100, caption=u"Текущее количество топлива", tags="client")
    p_fuel_rate = FloatField(default=0.5, caption=u"Расход топлива (л/с)")  # todo: Не нужно ли это поле пометить как параметр?

    # атрибуты влияющие на эффективность стрельбы
    dps_rate = FloatField(default=1.0, caption=u"Множитель модификации урона автоматического оружия")
    damage_rate = FloatField(default=1.0, caption=u"Множитель модификации урона залпового оружия")
    time_recharge_rate = FloatField(default=1.0, caption=u"Множитель модификации времени перезарядки залпового оружия")
    radius_rate = FloatField(default=1.0, caption=u"Множитель модификации дальности стрельбы")

    # атрибуты, отвечающие за авто-ремонт машины.
    repair_rate = FloatField(default=0, caption=u"Скорость отхила в секунду")
    repair_rate_on_stay = FloatField(default=0, caption=u"Дополнительная скорость отхила в стоячем положении")

    # атрибуты, связанные с критами.
    crit_rate = FloatField(default=0.5, caption=u"Шанс крита [0 .. сколько угодно, но больше 1 нет смысла]")
    crit_power = FloatField(default=0.5, caption=u"Сила крита [0 .. сколько угодно]")

    slot_FL   = SlotField(caption=u'ForwardLeftSlot', doc=u'Передний левый слот', tags='armorer')
    slot_FL_f = StringField(default='FL_0', caption=u'Флаги переднего левого слота [FBLR]', tags='client slot_limit')
    slot_CL   = SlotField(caption=u'LeftSlot', doc=u'Центральный левый слот', tags='armorer')
    slot_CL_f = StringField(default='FBL_0', caption=u'Флаги центрального левого слота [FBLR]', tags='client slot_limit')
    slot_BL   = SlotField(caption=u'BackwardLeftSlot', doc=u'Задний левый слот', tags='armorer')
    slot_BL_f = StringField(default='BL_0', caption=u'Флаги залнего левого слота [FBLR]', tags='client slot_limit')

    slot_FC   = SlotField(caption=u'ForwardSlot', doc=u'Передний средний слот', tags='armorer')
    slot_FC_f = StringField(default='FLR_0', caption=u'Флаги переднего среднего слота [FBLR]', tags='client slot_limit')
    slot_CC   = SlotField(caption=u'CentralSlot', doc=u'Центральный средний слот', tags='armorer')
    slot_CC_f = StringField(default='FBLR_0', caption=u'Флаги центрального среднего слота [FBLR]', tags='client slot_limit')
    slot_BC   = SlotField(caption=u'BackwardSlot', doc=u'Задний средний слот', tags='armorer')
    slot_BC_f = StringField(default='BLR_0', caption=u'Флаги заднего среднего слота [FBLR]', tags='client slot_limit')

    slot_FR   = SlotField(caption=u'ForwardRightSlot', doc=u'Передний правый слот', tags='armorer')
    slot_FR_f = StringField(default='FR_0', caption=u'Флаги переднего правого слота [FBLR]', tags='client slot_limit')
    slot_CR   = SlotField(caption=u'RightSlot', doc=u'Центральный правый слот', tags='armorer')
    slot_CR_f = StringField(default='FBR_0', caption=u'Флаги центрального правого слота [FBLR]', tags='client slot_limit')
    slot_BR   = SlotField(caption=u'BackwardRightSlot', doc=u'Задний правый слот', tags='armorer')
    slot_BR_f = StringField(default='BR_0', caption=u'Флаги заднего правого слота [FBLR]', tags='client slot_limit')

    inventory = InventoryField(caption=u'Инвентарь', doc=u'Список предметов в инвентаре ТС')
    inventory_size = IntField(default=10, caption=u"Размер инвентаря")

    # todo: реализовать предынициализацию инвентаря абстрактным в конструкторе
    price = FloatField(default=0, caption=u"Цена", tags='client')

    # Косметика
    title = StringField(default="", caption=u"Модель автомобиля", tags='client')
    class_car = StringField(default="", caption=u"Класс автомобиля", tags='client')
    sub_class_car = StringField(default="", caption=u"Подкласс автомобиля", tags='client')
    name_car = StringField(default="", caption=u"Название автомобиля", tags='client')

    # Влияние скилов
    driving_r_min = FloatField(default=0.0, caption=u"Влияние Вождения на Минимальный радиус разворота")
    driving_ac_max = FloatField(default=0.0, caption=u"Влияние Вождения на Максимальную перегрузка при развороте")
    driving_max_control_speed = FloatField(default=0.0, caption=u"Влияние Вождения на Абсолютную максимальную скорость движения")
    driving_v_forward = FloatField(default=0.0, caption=u"Влияние Вождения на Максимальную скорость движения вперед")
    driving_v_backward = FloatField(default=0.0, caption=u"Влияние Вождения на Максимальную скорость движения назад")
    driving_a_forward = FloatField(default=0.0, caption=u"Влияние Вождения на Ускорение разгона вперед")
    driving_a_backward = FloatField(default=0.0, caption=u"Влияние Вождения на Ускорение разгона назад")
    driving_a_braking = FloatField(default=0.0, caption=u"Влияние Вождения на Ускорение торможения")

    shooting_dps_rate = FloatField(default=0.0, caption=u"Влияние Стрельбы на Множитель модификации урона автоматического оружия")
    shooting_damage_rate = FloatField(default=0.0, caption=u"Влияние Стрельбы на Множитель модификации урона залпового оружия")
    shooting_time_recharge_rate = FloatField(default=0.0, caption=u"Влияние Стрельбы на Множитель модификации времени перезарядки залпового оружия")
    shooting_radius_rate = FloatField(default=0.0, caption=u"Влияние Стрельбы на Множитель модификации дальности стрельбы")

    masking_p_visibility = FloatField(default=0.0, caption=u"Влияние Маскировки на Коэффициент заметности")

    exp_table = UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.exptable.ExpTable',
        caption=u"Таблица опыта",
    )

    def iter_weapons(self):
        return (v for attr, v in self.iter_slots(tags='armorer') if isinstance(v, Weapon))

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
    last_parking_npc = UniReferenceField(
        reference_document_type='sublayers_server.model.registry.classes.poi.Parking',
        default=None, caption=u'Парковщик машины.',
    )
    date_setup_parking = FloatField(default=0, caption=u'Дата оставления у парковщика')

    # todo: Написать, что это пути к шаблонам
    armorer_car = StringField(caption=u"Представление машинки у оружейника")
    tuner_car = StringField(caption=u"Представление машинки у тюнера")
    armorer_sectors_svg = StringField(caption=u"Представление секторов машинки у оружейника")
    hangar_car = StringField(caption=u"Представление машинки в ангаре")
    image_scale = StringField(default="middle", caption=u"Масштаб машинки для отрисовки обвеса: small, middle, big", tags="client")

    mechanic_engine = StringField(caption=u"Представление двигателя у механника")
    mechanic_transmission = StringField(caption=u"Представление трансмиссии у механника")
    mechanic_brakes = StringField(caption=u"Представление тормозной системы у механника")
    mechanic_cooling = StringField(caption=u"Представление системы охлаждения у механника")
    mechanic_suspension = StringField(caption=u"Представление подвески у механника")

    inv_icon_big = StringField(caption=u'URL глифа (большой разиер) для блоков инвентарей', tags="client")
    inv_icon_mid = StringField(caption=u'URL глифа (средний размер) для блоков инвентарей', tags="client")
    inv_icon_small = StringField(caption=u'URL глифа (малый размер) для блоков инвентарей', tags="client")

    # Атрибуты - слоты механика. Скиданы в кучу, работают по тегам систем
    # Двигатель
    slot_m1 = SlotField(caption=u'M1', doc=u'Двигатель: впуск', tags='mechanic engine inlet')
    slot_m2 = SlotField(caption=u'M1', doc=u'Двигатель: компрессор', tags='mechanic engine compressor')
    slot_m3 = SlotField(caption=u'M1', doc=u'Двигатель: воздушный фильтр', tags='mechanic engine air_filter')
    slot_m4 = SlotField(caption=u'M1', doc=u'Двигатель: распредвал', tags='mechanic engine camshaft')
    slot_m5 = SlotField(caption=u'M1', doc=u'Двигатель: зажигание', tags='mechanic engine ignition')
    slot_m6 = SlotField(caption=u'M1', doc=u'Двигатель: ГБЦ', tags='mechanic engine cylinder_head')
    slot_m7 = SlotField(caption=u'M1', doc=u'Двигатель: ЦПГ', tags='mechanic engine cylinder_piston')
    slot_m8 = SlotField(caption=u'M1', doc=u'Двигатель: маховик', tags='mechanic engine flywheel')
    slot_m9 = SlotField(caption=u'M1', doc=u'Двигатель: масло', tags='mechanic engine engine_oil')
    slot_m10 = SlotField(caption=u'M1', doc=u'Двигатель: выпуск', tags='mechanic engine exhaust')

    slot_m11 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m12 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m13 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m14 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m15 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m16 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m17 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m18 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m19 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m20 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m21 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')
    slot_m22 = SlotField(caption=u'M1', doc=u'Двигатель: свеча зажигания', tags='mechanic engine sparkplug')

    # Трансмиссия
    slot_m23 = SlotField(caption=u'M1', doc=u'Трансмиссия: сцепление', tags='mechanic transmission clutch')
    slot_m24 = SlotField(caption=u'M1', doc=u'Трансмиссия: коробка передач', tags='mechanic transmission gearbox')
    slot_m25 = SlotField(caption=u'M1', doc=u'Трансмиссия: полуоси перед', tags='mechanic transmission front_axle')
    slot_m26 = SlotField(caption=u'M1', doc=u'Трансмиссия: полуоси зад', tags='mechanic transmission rear_axle')
    slot_m27 = SlotField(caption=u'M1', doc=u'Трансмиссия: дифференциал перед', tags='mechanic transmission front_differential')
    slot_m28 = SlotField(caption=u'M1', doc=u'Трансмиссия: дифференциал зад', tags='mechanic transmission rear_differential')
    slot_m29 = SlotField(caption=u'M1', doc=u'Трансмиссия: трансмиссионное масло', tags='mechanic transmission ATF')
    slot_m30 = SlotField(caption=u'M1', doc=u'Трансмиссия: первичный вал', tags='mechanic transmission primary_shaft')
    slot_m31 = SlotField(caption=u'M1', doc=u'Трансмиссия: вторичный вал', tags='mechanic transmission secondary_shaft')
    slot_m32 = SlotField(caption=u'M1', doc=u'Трансмиссия: гидротрансформатор', tags='mechanic transmission torque_converter')
    slot_m33 = SlotField(caption=u'M1', doc=u'Трансмиссия: раздатка', tags='mechanic transmission transfer_case')

    # Подвеска
    slot_m34 = SlotField(caption=u'M1', doc=u'Подвеска: передние амортизаторы', tags='mechanic suspension front_shock_absorber')
    slot_m35 = SlotField(caption=u'M1', doc=u'Подвеска: передние амортизаторы', tags='mechanic suspension front_shock_absorber')
    slot_m36 = SlotField(caption=u'M1', doc=u'Подвеска: задние амортизаторы', tags='mechanic suspension rear_shock_absorber')
    slot_m37 = SlotField(caption=u'M1', doc=u'Подвеска: задние амортизаторы', tags='mechanic suspension rear_shock_absorber')
    slot_m38 = SlotField(caption=u'M1', doc=u'Подвеска: передние пружины', tags='mechanic suspension front_coil')
    slot_m39 = SlotField(caption=u'M1', doc=u'Подвеска: передние пружины', tags='mechanic suspension front_coil')
    slot_m40 = SlotField(caption=u'M1', doc=u'Подвеска: задние пружины', tags='mechanic suspension rear_coil')
    slot_m41 = SlotField(caption=u'M1', doc=u'Подвеска: задние пружины', tags='mechanic suspension rear_coil')
    slot_m42 = SlotField(caption=u'M1', doc=u'Подвеска: передние рычаги', tags='mechanic suspension front_control_arm')
    slot_m43 = SlotField(caption=u'M1', doc=u'Подвеска: передние рычаги', tags='mechanic suspension front_control_arm')
    slot_m44 = SlotField(caption=u'M1', doc=u'Подвеска: задние рычаги', tags='mechanic suspension rear_control_arm')
    slot_m45 = SlotField(caption=u'M1', doc=u'Подвеска: задние рычаги', tags='mechanic suspension rear_control_arm')

    slot_m46 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m47 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m48 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m49 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m50 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m51 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m52 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')
    slot_m53 = SlotField(caption=u'M1', doc=u'Подвеска: ступица', tags='mechanic suspension hub')

    slot_m89 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m90 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m91 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m92 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m93 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m94 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m95 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')
    slot_m96 = SlotField(caption=u'M1', doc=u'Подвеска: колесо', tags='mechanic suspension wheels')

    # Тормоза
    slot_m54 = SlotField(caption=u'M1', doc=u'Тормоза: передние тормозные механизмы', tags='mechanic brakes front_brakes')
    slot_m55 = SlotField(caption=u'M1', doc=u'Тормоза: передние тормозные механизмы', tags='mechanic brakes front_brakes')

    slot_m56 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m57 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m58 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m59 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m60 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')
    slot_m61 = SlotField(caption=u'M1', doc=u'Тормоза: задние тормозные механизмы', tags='mechanic brakes rear_brakes')

    slot_m62 = SlotField(caption=u'M1', doc=u'Тормоза: передние колодки', tags='mechanic brakes front_brake_pads')
    slot_m63 = SlotField(caption=u'M1', doc=u'Тормоза: передние колодки', tags='mechanic brakes front_brake_pads')

    slot_m64 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m65 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m66 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m67 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m68 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')
    slot_m69 = SlotField(caption=u'M1', doc=u'Тормоза: задние колодки', tags='mechanic brakes rear_brake_pads')

    slot_m70 = SlotField(caption=u'M1', doc=u'Тормоза: усилитель тормозов', tags='mechanic brakes booster')

    slot_m71 = SlotField(caption=u'M1', doc=u'Тормоза: АБС', tags='mechanic brakes abs')

    slot_m72 = SlotField(caption=u'M1', doc=u'Тормоза: шланги перед', tags='mechanic brakes front_brake_lines')
    slot_m73 = SlotField(caption=u'M1', doc=u'Тормоза: шланги перед', tags='mechanic brakes front_brake_lines')

    slot_m74 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m75 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m76 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m77 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m78 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')
    slot_m79 = SlotField(caption=u'M1', doc=u'Тормоза: шланги зад', tags='mechanic brakes rear_brake_lines')

    slot_m80 = SlotField(caption=u'M1', doc=u'Тормоза: тормозная жидкость', tags='mechanic brakes brake_fluid')

    # Охлаждение
    slot_m81 = SlotField(caption=u'M1', doc=u'Охлаждение: радиатор', tags='mechanic cooling radiator')
    slot_m82 = SlotField(caption=u'M1', doc=u'Охлаждение: помпа', tags='mechanic cooling pump')
    slot_m83 = SlotField(caption=u'M1', doc=u'Охлаждение: охлаждающая жидкость', tags='mechanic cooling coolant')
    slot_m84 = SlotField(caption=u'M1', doc=u'Охлаждение: дополнительный радиатор', tags='mechanic cooling add_radiator')
    slot_m85 = SlotField(caption=u'M1', doc=u'Охлаждение: термостат', tags='mechanic cooling thermostat')

    slot_m86 = SlotField(caption=u'M1', doc=u'Охлаждение: вентилятор', tags='mechanic cooling fan')
    slot_m87 = SlotField(caption=u'M1', doc=u'Охлаждение: вентилятор', tags='mechanic cooling fan')
    slot_m88 = SlotField(caption=u'M1', doc=u'Охлаждение: вентилятор', tags='mechanic cooling fan')

    slot_t1 = SlotField(caption=u't2', doc=u'Слот тюнера задний бампер', tags='tuner wheels')
    slot_t2 = SlotField(caption=u't2', doc=u'Слот тюнера задний бампер', tags='tuner b_fender')
    slot_t3 = SlotField(caption=u't3', doc=u'Слот тюнера спойлер', tags='tuner b_glass')
    slot_t4 = SlotField(caption=u't1', doc=u'Слот тюнера передний бампер', tags='tuner f_bumper')
    slot_t5 = SlotField(caption=u't2', doc=u'Слот тюнера задний бампер', tags='tuner f_fender')
    slot_t6 = SlotField(caption=u't3', doc=u'Слот тюнера спойлер', tags='tuner f_glass')
    slot_t7 = SlotField(caption=u't1', doc=u'Слот тюнера передний бампер', tags='tuner roof')
    slot_t8 = SlotField(caption=u't2', doc=u'Слот тюнера задний бампер', tags='tuner skirt')
    slot_t9 = SlotField(caption=u't1', doc=u'Слот тюнера передний бампер', tags='tuner b_bumper')

    slot_t10 = SlotField(caption=u't1', doc=u'Слот тюнера воздухозаборник', tags='tuner airint')
    slot_t11 = SlotField(caption=u't1', doc=u'Слот тюнера броня', tags='tuner armor')
    slot_t12 = SlotField(caption=u't1', doc=u'Слот тюнера баул', tags='tuner bale')
    slot_t13 = SlotField(caption=u't1', doc=u'Слот тюнера шноркель', tags='tuner shnork')
    slot_t14 = SlotField(caption=u't1', doc=u'Слот тюнера ступенька', tags='tuner step')
    slot_t15 = SlotField(caption=u't1', doc=u'Слот тюнера доп.багажник', tags='tuner trunk')
    slot_t16 = SlotField(caption=u't1', doc=u'Слот тюнера козырек', tags='tuner visor')
    slot_t17 = SlotField(caption=u't1', doc=u'Слот тюнера защита стёкол', tags='tuner win_prot')


class Drone(Mobile):
    pass


class MobileWeapon(Mobile):
    pass


class MapWeaponEffectMine(MobileWeapon):
    # todo: заменить имена эффектов на URI
    effects = StringField(default=(), caption=u'Список эффектов (URI) накладываемых миной')


class MapWeaponRocket(MobileWeapon):
    radius_damage = FloatField(default=30.0, caption=u"Радиус взрыва ракеты")
    damage = FloatField(default=30.0, caption=u"Дамаг в радиусе взрыва")
    life_time = FloatField(default=10.0, caption=u"Время жизни ракеты")


