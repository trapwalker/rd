# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from party import RoleParty, Role
from vectors import Point
from units import Bot
from events import Event
from trigger import Trigger
from messages import Message

from math import pi, radians


class CargoBot(Bot):
    def __init__(self, *av, **kw):
        super(CargoBot, self).__init__(*av, **kw)
        self.server.mission_cargo = self

    def on_die(self, event):
        super(CargoBot, self).on_die(event=event)
        log.debug('Cargo is DIE!')
        WinEvent(server=self.server, winner_unit=None).post()


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
            WinMessage(agent=agent, time=self.time, winner_unit=self.unit).post()


class WinTrigger(Trigger):
    def on_contact_in(self, obj):
        """
        @param sublayers_server.model.base.VisibleObject obj: Object of contact
        """
        log.debug('Win trigger tested: %s', obj)
        if isinstance(obj, Bot) and obj.owner and obj.role and obj.role.name == 'Cargo':
            log.debug('Win trigger accepted!: %s', obj)
            WinEvent(server=self.server, winner_unit=obj).post()


class Corp(RoleParty):
    def __init__(self):
        # todo: add role unit class to params
        super(Corp, self).__init__(
            base_point=Point(12535178, 27032679),
            roles=[
                Role('Cargo',
                    car_params=dict(
                        cls=CargoBot,
                        max_hp=300,
                        v_max=(40 * 1000 / 3600),
                        observing_range=1500,
                        weapons=[
                            dict(fi=pi/2, is_auto=False, radius=250, width=radians(45), dmg=10, time_recharge=5),
                            dict(fi=-pi/2, is_auto=False, radius=150, width=radians(45), dmg=10, time_recharge=5),
                            dict(fi=pi, is_auto=False, radius=200, width=radians(60), dmg=10, time_recharge=5),
                        ],
                     ),
                     max_count=1,
                     weight=1000,
                ),
                Role('Rover',
                    car_params=dict(
                        max_hp=100,
                        v_max=(80 * 1000 / 3600),
                        observing_range=1200,
                        weapons=[
                            dict(fi=0, is_auto=False, radius=200, width=radians(40), dmg=10, time_recharge=5),
                            dict(fi=pi/2, is_auto=True, radius=200, width=radians(30), dps=20),
                            dict(fi=-pi/2, is_auto=True, radius=200, width=radians(30), dps=20),
                        ],
                     ),
                     weight=1,
                ),
                Role('Scout',
                    car_params=dict(
                        max_hp=70,
                        v_max=(125 * 1000 / 3600),
                        observing_range=2000,
                        weapons=[
                            dict(fi=0, is_auto=False, radius=150, width=radians(40), dmg=5, time_recharge=3),
                            dict(fi=0, is_auto=True, radius=300, width=radians(30), dps=2),
                        ],
                     ),
                     weight=1,
                ),
                Role('Tank',
                    car_params=dict(
                        max_hp=180,
                        v_max=(45 * 1000 / 3600),
                        observing_range=1000,
                        weapons=[
                            dict(fi=0, is_auto=False, radius=200, width=radians(270), dmg=10, time_recharge=5),
                        ],
                     ),
                     weight=1,
                ),
            ],
        )


class Band(RoleParty):
    def __init__(self):
        super(Band, self).__init__(
            base_point=Point(12535178, 27032679),
            roles=[
                Role('Rover',
                    car_params=dict(
                        max_hp=100,
                        v_max=(80 * 1000 / 3600),
                        observing_range=1200,
                        weapons=[
                            dict(fi=0, is_auto=False, radius=200, width=radians(40), dmg=10, time_recharge=5),
                            dict(fi=pi/2, is_auto=True, radius=200, width=radians(30), dps=20),
                            dict(fi=-pi/2, is_auto=True, radius=200, width=radians(30), dps=20),
                        ],
                     ),
                     weight=1,
                ),
                Role('Scout',
                    car_params=dict(
                        max_hp=70,
                        v_max=(125 * 1000 / 3600),
                        observing_range=2000,
                        weapons=[
                            dict(fi=0, is_auto=False, radius=150, width=radians(40), dmg=5, time_recharge=3),
                            dict(fi=0, is_auto=True, radius=300, width=radians(30), dps=2),
                        ],
                     ),
                     weight=1,
                ),
                Role('Tank',
                    car_params=dict(
                        max_hp=180,
                        v_max=(45 * 1000 / 3600),
                        observing_range=1000,
                        weapons=[
                            dict(fi=0, is_auto=False, radius=200, width=radians(270), dmg=10, time_recharge=5),
                        ],
                     ),
                     weight=1,
                ),
            ],
        )