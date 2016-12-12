# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.messages import Message


class LocationLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, location, action, **kw):
        super(LocationLogMessage, self).__init__(**kw)
        self.location = location
        self.action = action

    def as_dict(self):
        d = super(LocationLogMessage, self).as_dict()
        d.update(
            location_name=self.location.example.title,
            action=self.action,
        )
        return d


class BarterLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, action, apponent, **kw):
        super(BarterLogMessage, self).__init__(**kw)
        self.action = action
        self.apponent = apponent

    def as_dict(self):
        d = super(BarterLogMessage, self).as_dict()
        d.update(
            action=self.action,
            apponent=self.apponent.print_login(),
        )
        return d


class ExpLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, d_exp, **kw):
        super(ExpLogMessage, self).__init__(**kw)
        self.d_exp = d_exp

    def as_dict(self):
        d = super(ExpLogMessage, self).as_dict()
        d.update(
            d_exp=self.d_exp
        )
        return d


class WeaponAmmoFinished(Message):
    def __init__(self, weapon, **kw):
        super(WeaponAmmoFinished, self).__init__(**kw)
        self.weapon = weapon

    def as_dict(self):
        d = super(WeaponAmmoFinished, self).as_dict()
        d.update(
            weapon_name=self.weapon.example.title,
        )
        return d
class TransactionGasStationLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, d_fuel, tank_list, **kw):
        super(TransactionGasStationLogMessage, self).__init__(**kw)
        self.d_fuel = d_fuel
        self.tank_list = tank_list

    def as_dict(self):
        d = super(TransactionGasStationLogMessage, self).as_dict()
        d.update(
            d_fuel=self.d_fuel,
            tank_list=[tank.value_fuel for tank in self.tank_list],
        )
        return d


class TransactionHangarLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, car, action, price, **kw):
        super(TransactionHangarLogMessage, self).__init__(**kw)
        self.car = car
        self.price = price
        self.action = action

    def as_dict(self):
        d = super(TransactionHangarLogMessage, self).as_dict()
        d.update(
            car=self.car.title,
            price=self.price,
            action=self.action,
        )
        return d


class TransactionParkingLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, car, action, price, **kw):
        super(TransactionParkingLogMessage, self).__init__(**kw)
        self.car = car
        self.price = price
        self.action = action

    def as_dict(self):
        d = super(TransactionParkingLogMessage, self).as_dict()
        d.update(
            car=self.car.title,
            price=self.price,
            action=self.action,
        )
        return d