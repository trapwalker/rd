# -*- coding: utf-8 -*-

from base import Stationary


class BALANCE(object):
    u'''Gameplay balancing settings'''

    @classmethod
    def get_ObserverRange(cls, unit):
        return 100 * (5 if isinstance(unit, Stationary) else 1)

    @classmethod
    def get_MaxVelocity(cls, unit):
        return 3 # m/s

