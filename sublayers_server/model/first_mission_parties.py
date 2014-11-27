# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from party import RoleParty, Role
from weapons import SectoralWeapon
from vectors import Point
from units import Bot
from events import Event
from trigger import Trigger
from messages import Message

from math import pi


class CargoBot(Bot):
    def __init__(self, *av, **kw):
        super(CargoBot, self).__init__(*av, **kw)
        self.server.mission_cargo = self

    def on_die(self):
        super(CargoBot, self).on_die()
        log.debug('Cargo is DIE!')
        self.server.post_event(WinEvent(server=self.server, winner_unit=None))


class WinMessage(Message):
    # todo: may be Message made mixin to Event?
    def __init__(self, winner_unit, **kw):
        """
        @param sublayers_server.model.units.Unit winner_unit: Winner
        """
        super(WinMessage, self).__init__(**kw)
        self.unit = winner_unit

    def as_dict(self):
        d = super(WinMessage, self).as_dict()
        d.update(
            winner=self.unit.as_dict(to_time=self.time) if self.unit else None,
        )
        return d


class WinEvent(Event):
    def __init__(self, winner_unit, **kw):
        """
        @param sublayers_server.model.units.Unit winner_unit: Winner
        """
        super(WinEvent, self).__init__(**kw)
        self.unit = winner_unit

    def perform(self):
        for agent in self.server.agents.values():
            self.server.post_message(WinMessage(agent=agent, time=self.time, winner_unit=self.unit))


class WinTrigger(Trigger):
    def on_contact_in(self, obj):
        """
        @param sublayers_server.model.base.VisibleObject obj: Object of contact
        """
        log.debug('Win trigger tested: %s', obj)
        if isinstance(obj, Bot) and obj.owner and obj.role and obj.role.name == 'Cargo':
            log.debug('Win trigger accepted!: %s', obj)
            self.server.post_event(WinEvent(server=self.server, winner_unit=obj))


class Corp(RoleParty):
    def __init__(self):
        # todo: add role unit class to params
        super(Corp, self).__init__(
            base_point=Point(4835, 23804),  # Девый город
            roles=[
                Role('Cargo',
                    car_params=dict(
                        cls=CargoBot,
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
