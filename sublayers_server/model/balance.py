# -*- coding: utf-8 -*-

from math import pi, radians

class BalanceSettingsABS:
    def __init__(self):
        raise NotImplementedError


class EffectsDict:
    # todo: тут напутано со знаками, кое-где проставить sign=1.0
    dicts = [
        # dirt
        dict(name='EffectDirtCC', param_name='p_cc', m_name='m_cc_dirt', r_name='r_cc_dirt',
             upd_method='set_motion', sign=-1.0),

        # wood
        dict(name='EffectWoodCC', param_name='p_cc', m_name='m_cc_wood', r_name='r_cc_wood',
             upd_method='set_motion', sign=-1.0),
        dict(name='EffectWoodVisibility', param_name='p_visibility', m_name='m_visibility_wood',
             r_name='r_visibility_wood', sign=-1.0),
        dict(name='EffectWoodObsRange', param_name='p_observing_range', m_name='m_observing_range_wood',
             r_name='r_observing_range_wood', sign=-1.0),

        # water
        dict(name='EffectWaterCC', param_name='p_cc', m_name='m_cc_water', r_name='r_cc_water',
             upd_method='set_motion', sign=-1.0),

        # road
        # road effects_resist
        dict(name='EffectRoadRCCWood', param_name='r_cc_wood', m_name='m_r_cc_wood_on_road',
             r_name='r_empty', upd_method='set_motion', absolute=True, sign=1.0),
        dict(name='EffectRoadRCCWater', param_name='r_cc_water', m_name='m_r_cc_water_on_road',
             r_name='r_empty', upd_method='set_motion', absolute=True, sign=1.0),
        dict(name='EffectRoadRCCDirt', param_name='r_cc_dirt', m_name='m_r_cc_dirt_on_road',
             r_name='r_empty', upd_method='set_motion', absolute=True, sign=1.0),

    ]


class BALANCE(BalanceSettingsABS):
    """Gameplay balancing settings"""

    # todo: резист не должен быть равен 0, иначе его нельзя изменить будет
    default_resists = [
        dict(name='r_empty', original=0.0, max_value=1.0),

        dict(name='r_cc_dirt', original=0.0, max_value=1.0),

        dict(name='r_cc_wood', original=0.0, max_value=1.0),
        dict(name='r_visibility_wood', original=0.0, max_value=1.0),
        dict(name='r_observing_range_wood', original=0.0, max_value=1.0),

        dict(name='r_cc_water', original=0.0, max_value=1.0),

        dict(name='r_cc_road', original=0.0, max_value=1.0),
        dict(name='r_visibility_road', original=0.0, max_value=1.0),
        dict(name='r_fuel_rate_road', original=0.0, max_value=1.0),
    ]

    default_modifiers = [
        dict(name='m_cc_dirt', original=0.2),

        dict(name='m_cc_wood', original=0.3),
        dict(name='m_visibility_wood', original=0.5),
        dict(name='m_observing_range_wood', original=0.5),

        dict(name='m_cc_water', original=0.45),

        dict(name='m_r_cc_wood_on_road', original=1.0),
        dict(name='m_r_cc_water_on_road', original=1.0),
        dict(name='m_r_cc_dirt_on_road', original=1.0),
    ]

    class Observer(BalanceSettingsABS):
        observing_range = 1000.0

    class Unit(Observer):
        defence = 1.0
        max_hp = 100.0
        direction = -pi/2

    class Station(Unit):
        max_hp = 1000.0

    class Mobile(Unit):
        r_min = 10
        ac_max = 10.0
        v_max = 30.0
        a_accelerate = 4.0
        a_braking = -8.0
        max_control_speed = 30.0  # max_control_speed <= v_max
        max_fuel = 1000.0
        fuel = 1000.0

    class Bot(Mobile):
        velocity = 100.0  # m/s

        @staticmethod
        def rv_relation(v):
            return (0.015 * abs(v) ** 1.9) + 5

        @staticmethod
        def get_contact_distance(subj, obj):
            """
            @param subj: sublayers_server.model.base.Observer
            @param obj: sublayers_server.model.base.VisibleObject
            """
            # Дистанция, на котороую субъект видит нескрытного объекта
            subj_range_view = subj.r

            # скрытность объекта [0-1]:
            #   0.0 -- совсем нет маскировки
            #   1.0 -- затонирован полностью, не зоркий субьект не увидит и вплотную
            obj_obscurity = obj.obscurity if hasattr(obj, 'obscurity') else 0.0

            # Зоркость субъекта [0-1] - противодействие скрытности:
            #   0.0 -- не противодействует,
            #   0.5 -- вдвое снижает скрытность объекта
            #   1.0 -- полностью компенсирует любую скрытность объекта
            subj_vigilance = subj.vigilance if hasattr(subj, 'vigilance') else 0.0  # Зоркость субьекта ()

            assert 0.0 <= subj_vigilance <= 1.0, 'Subject {} vigilance not in range [0..1]'.format(subj)
            assert 0.0 <= obj_obscurity <= 1.0, 'Object {} vigilance not in range [0..1]'.format(obj)
            # радиус, на котором субьект заметит объекта
            r = subj_range_view * (1 - obj_obscurity * (1 - subj_vigilance))

            return r

    class Weapon(BalanceSettingsABS):
        dmg = 10.0
        dps = 1
        radius = 50.0
        width = pi / 2
        time_recharge = 6

    class ScoutDroid(Mobile):
        observing_range = 500.0
        max_hp = 60.0
        r_min=5.0
        a_forward = 5.0
        a_braking = -5.0
        v_forward = (100 * 1000 / 3600)
        ac_max = 11.0
        max_control_speed = 60.0
        fuel = 70.0
        max_fuel = 70.0
        weapons = [
            dict(fi=0.0, is_auto=True, radius=200, width=radians(90), dps=0.1),
            dict(fi=-pi / 2, is_auto=True, radius=200, width=radians(90), dps=0.1),
            dict(fi=pi / 2, is_auto=True, radius=200, width=radians(90), dps=0.1),
            dict(fi=-pi, is_auto=True, radius=200, width=radians(90), dps=0.1)
        ]

    class StationaryTurret(Mobile):
        observing_range = 300.0
        max_hp = 100.0
        r_min=5.0
        a_forward = 3.0
        a_braking = -3.0
        v_forward = (1 * 1000 / 3600)
        ac_max = 10.0
        max_control_speed = 1.0
        weapons = [
            dict(fi=0.0, is_auto=True, radius=200, width=radians(90), dps=0.1),
            dict(fi=-pi / 2, is_auto=True, radius=200, width=radians(90), dps=0.1),
            dict(fi=pi / 2, is_auto=True, radius=200, width=radians(90), dps=0.1),
            dict(fi=-pi, is_auto=True, radius=200, width=radians(90), dps=0.1)
        ]

    class Rocket(Mobile):
        observing_range = 50.0  # очень небольшой радиус. думаю от 100 до 300 должен быть
        max_hp = 5.0
        a_forward = 5.0  # ускорение ракеты
        a_braking = -50.0   # торможение ракеты ... будто она упала на землю
        v_forward = 30.0         # максимальная скорость ракеты
        ac_max = 1000.0         # на будущее
        max_control_speed = 200.0
        radius_damage = 120.0
        damage = 10.0

    class SlowMine(Mobile):
        observing_range = 50.0  # очень небольшой радиус. думаю от 100 до 300 должен быть
        max_hp = 10.0
        a_forward = 100.0  # ускорение ракеты
        a_braking = -50.0   # торможение ракеты ... будто она упала на землю
        v_forward = 200.0         # максимальная скорость ракеты
        ac_max = 1000.0         # на будущее
        max_control_speed = 200.0

    class RocketBang:
        duration = 2000  # ms задавать в милисекундах - время расплывания круга
        end_duration = 1000  # ms длдительность затухания круга
        bang_power = 50  # px - радиус взрыва в пикселях на экране... сейчас не засисит от зума
