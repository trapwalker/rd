# -*- coding: utf-8 -*-

class BALANCE:
    u'''Gameplay balancing settings'''

    class Unit:
        defence = 1.0

    class Station(Unit):
        observing_range = 500.0
        max_hp = 1000.0

    class Bot(Unit):
        observing_range = 100.0
        velocity = 100.0  # m/s
        max_hp = 100.0

        @staticmethod
        def rv_relation(v):
            return abs(v) + 5

    class Weapon:
        damage = 10.0
        r = 50.0
