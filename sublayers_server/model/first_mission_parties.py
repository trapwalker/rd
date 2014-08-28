# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from party import RoleParty, Role
from weapons import SectoralWeapon
from vectors import Point

from math import pi


class Corp(RoleParty):
    def __init__(self):
        super(Corp, self).__init__(
            base_point=Point(4835, 23804),  # Девый город
            roles=[
                Role('Cargo',
                    car_params=dict(
                        max_hp=300,
                        max_velocity=40,
                        observing_range=1500,
                        weapons=[
                            SectoralWeapon(direction=pi, sector_width=70, r=200, damage=10),
                            SectoralWeapon(direction=pi/2, sector_width=70, r=150, damage=10),
                            SectoralWeapon(direction=-pi/2, sector_width=70, r=150, damage=10),
                        ],
                     ),
                     max_count=1,
                     weight=1000,
                ),
                Role('Rover',
                    car_params=dict(
                        max_hp=100,
                        max_velocity=80,
                        observing_range=1200,
                        weapons=[
                            SectoralWeapon(direction=0, sector_width=50, r=350, damage=10),
                            SectoralWeapon(direction=pi/2, sector_width=50, r=300, damage=10),
                            SectoralWeapon(direction=-pi/2, sector_width=50, r=300, damage=10),
                        ],
                     ),
                     weight=1,
                ),
                Role('Scout',
                    car_params=dict(
                        max_hp=70,
                        max_velocity=125,
                        observing_range=2000,
                        weapons=[
                            SectoralWeapon(direction=0, sector_width=40, r=400, damage=6),
                        ],
                     ),
                     weight=1,
                ),
                Role('Tank',
                    car_params=dict(
                        max_hp=180,
                        max_velocity=60,
                        observing_range=1000,
                        weapons=[
                            SectoralWeapon(direction=0, sector_width=80, r=200, damage=18),
                            SectoralWeapon(direction=pi, sector_width=80, r=150, damage=12),
                            SectoralWeapon(direction=pi/2, sector_width=80, r=150, damage=12),
                            SectoralWeapon(direction=-pi/2, sector_width=80, r=150, damage=12),
                        ],
                     ),
                     weight=1,
                ),
            ],
        )


class Band(RoleParty):
    def __init__(self):
        super(Band, self).__init__(
            base_point=Point(17031, 19632),  # Центральный город
            roles=[
                Role('Rover',
                    car_params=dict(
                        max_hp=100,
                        max_velocity=80,
                        observing_range=1200,
                        weapons=[
                            SectoralWeapon(direction=0, sector_width=50, r=350, damage=10),
                            SectoralWeapon(direction=pi/2, sector_width=50, r=300, damage=10),
                            SectoralWeapon(direction=-pi/2, sector_width=50, r=300, damage=10),
                        ],
                     ),
                     weight=1,
                ),
                Role('Scout',
                    car_params=dict(
                        max_hp=70,
                        max_velocity=125,
                        observing_range=2000,
                        weapons=[
                            SectoralWeapon(direction=0, sector_width=40, r=400, damage=6),
                        ],
                     ),
                     weight=1,
                ),
                Role('Tank',
                    car_params=dict(
                        max_hp=180,
                        max_velocity=60,
                        observing_range=1000,
                        weapons=[
                            SectoralWeapon(direction=0, sector_width=80, r=200, damage=18),
                            SectoralWeapon(direction=pi, sector_width=80, r=150, damage=12),
                            SectoralWeapon(direction=pi/2, sector_width=80, r=150, damage=12),
                            SectoralWeapon(direction=-pi/2, sector_width=80, r=150, damage=12),
                        ],
                     ),
                     weight=1,
                ),
            ],
        )
