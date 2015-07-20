# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.vectors import Point
from sublayers_server.model.units import Bot
from math import pi, radians


class RandomCarList:
    def __init__(self):
        self.params_cars = []
        self.base_point = Point(12496376, 27133643)
        self.params_cars.append(
            dict(
                max_hp=100,
                r_min=14.0,
                ac_max=14.0,
                v_forward=(80 * 1000 / 3600),
                v_backward=(-40 * 1000 / 3600),
                a_forward=4.0,
                a_backward=-3.0,
                a_braking=-6.0,
                observing_range=270,
                weapons=[
                    dict(fi=0, is_auto=False, radius=200, width=radians(40), dmg=10, time_recharge=5),
                    dict(fi=0, is_auto=False, radius=50, width=radians(60), dmg=2, time_recharge=10),
                    dict(fi=pi / 2, is_auto=True, radius=200, width=radians(30), dps=0.5),
                    dict(fi=-pi / 2, is_auto=True, radius=200, width=radians(30), dps=0.5),
                ],
            )
        )

        self.params_cars.append(
            dict(
                max_hp=70,
                r_min=10.0,
                ac_max=18.0,
                v_forward=(120 * 1000 / 3600),
                v_backward=(-15 * 1000 / 3600),
                a_forward=4.0,
                a_backward=-2.0,
                a_braking=-8.9,
                observing_range=300,
                weapons=[
                    dict(fi=0, is_auto=False, radius=150, width=radians(40), dmg=5, time_recharge=3),
                    dict(fi=0, is_auto=False, radius=50, width=radians(60), dmg=2, time_recharge=10),
                    dict(fi=0, is_auto=True, radius=300, width=radians(30), dps=0.8),
                ],
            )
        )

    def get_random_car(self, agent, time, position=None, id=None):
        import random
        id_car = -1
        if (id is not None) and (id < len(self.params_cars)):
            id_car = id
        else:
            id_car = random.randint(0, len(self.params_cars) - 1)
        return Bot(
            time=time,
            server=agent.server,
            owner=agent,
            position=position if position is not None else self.base_point,
            **self.params_cars[id_car]
        )