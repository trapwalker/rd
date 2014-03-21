# -*- coding: utf-8 -*-

class BALANCE(object):
    u'''Gameplay balancing settings'''

    @classmethod
    def get_ObserverRange(cls, unit):
        """
        @type unit: model.units.Unit
        """
        from units import Station
        return 100 * (5 if isinstance(unit, Station) else 1)

    @classmethod
    def get_MaxVelocity(cls, bot):
        """
        @type bot: model.units.Bot
        """
        return 3 # m/s

