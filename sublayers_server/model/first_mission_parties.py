# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point
from units import Bot
from math import pi, radians


class RandomCarList:
    def __init__(self):
        self.params_cars = []
        self.base_point = Point(12494648, 27025580)
        self.params_cars.append(
            dict(
                max_hp=100,
                v_max=(80 * 1000 / 3600),
                observing_range=300,
                weapons=[
                    dict(fi=0, is_auto=False, radius=200, width=radians(40), dmg=10, time_recharge=5),
                    dict(fi=pi / 2, is_auto=True, radius=200, width=radians(30), dps=0.5),
                    dict(fi=-pi / 2, is_auto=True, radius=200, width=radians(30), dps=0.5),
                ],
            )
        )

        self.params_cars.append(
            dict(
                max_hp=70,
                v_max=(125 * 1000 / 3600),
                observing_range=300,
                weapons=[
                    dict(fi=0, is_auto=False, radius=150, width=radians(40), dmg=5, time_recharge=3),
                    dict(fi=0, is_auto=True, radius=300, width=radians(30), dps=0.8),
                ],
            )
        )

    def get_random_car(self, agent, id=None):
        import random
        id_car = -1
        if (id is not None) and (id < len(self.params_cars)):
            id_car = id
        else:
            id_car = random.randint(0, len(self.params_cars) - 1)
        return Bot(
            server=agent.server,
            owner=agent,
            position=self.base_point,
            **self.params_cars[id_car]
        )