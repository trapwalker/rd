# -*- coding: utf-8 -*-

from math import pi


class BalanceSettingsABS:
    def __init__(self):
        raise NotImplementedError


class BALANCE(BalanceSettingsABS):
    """Gameplay balancing settings"""

    class Observer(BalanceSettingsABS):
        observing_range = 1000.0

    class Unit(Observer):
        defence = 1.0
        max_hp = 100.0
        direction = -pi/2

    class Station(Unit):
        max_hp = 1000.0

    class Mobile(Unit):
        r_min=10
        ac_max=10.0
        v_max=30.0
        a_accelerate=4.0
        a_braking=-8.0

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

    class Rocket:
        observing_range = 100.0 # очень небольшой радиус. думаю от 100 до 300 должен быть
        max_hp = 10.0
        life_time = 6.0  # s  (время полёта ракеты до заканчивания её топлива)
        a_accelerate = 200  # ускорение ракеты
        a_braking = -50.0   # торможение ракеты ... будто она упала на землю
        velocity = 300.0         # максимальная скорость ракеты
        ac_max = 10.0         # на будущее

    class RocketBang:
        duration = 2000 # ms задавать в милисекундах - время расплывания круга
        end_duration = 1000  #ms    длдительность затухания круга
        bang_power = 50  # px - радиус взрыва в пикселях на экране... сейчас не засисит от зума
