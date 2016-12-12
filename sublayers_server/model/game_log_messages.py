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


class LvlLogMessage(Message):
    def __init__(self, lvl, **kw):
        super(LvlLogMessage, self).__init__(**kw)
        self.lvl = lvl

    def as_dict(self):
        d = super(LvlLogMessage, self).as_dict()
        d.update(
            lvl=self.lvl
        )
        return d


class WeaponAmmoFinishedLogMessage(Message):
    def __init__(self, weapon, **kw):
        super(WeaponAmmoFinishedLogMessage, self).__init__(**kw)
        self.weapon = weapon

    def as_dict(self):
        d = super(WeaponAmmoFinishedLogMessage, self).as_dict()
        d.update(
            weapon_name=self.weapon.example.title,
        )
        return d


class TransactionActivateItemLogMessage(Message):
    def __init__(self, item, **kw):
        super(TransactionActivateItemLogMessage, self).__init__(**kw)
        self.item = item

    def as_dict(self):
        d = super(TransactionActivateItemLogMessage, self).as_dict()
        d.update(
            item_title=self.item.title,
        )
        return d


class TransactionActivateTankLogMessage(TransactionActivateItemLogMessage):
    def as_dict(self):
        d = super(TransactionActivateTankLogMessage, self).as_dict()
        d.update(
            value_fuel=self.item.value_fuel,
        )
        return d


class TransactionActivateRebuildSetLogMessage(TransactionActivateItemLogMessage):
    def as_dict(self):
        d = super(TransactionActivateRebuildSetLogMessage, self).as_dict()
        d.update(
            build_points=self.item.build_points,
        )
        return d


class TransactionActivateAmmoBulletsLogMessage(TransactionActivateItemLogMessage):
    def as_dict(self):
        d = super(TransactionActivateAmmoBulletsLogMessage, self).as_dict()
        d.update(
            ammo_title=self.item.title,
        )
        return d


class TransactionActivateMineLogMessage(TransactionActivateItemLogMessage):
    pass


class TransactionActivateRocketLogMessage(TransactionActivateItemLogMessage):
    pass


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
            tank_list=[tank.title for tank in self.tank_list],
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


class TransactionArmorerLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, setup_list, remove_list, price, **kw):
        super(TransactionArmorerLogMessage, self).__init__(**kw)
        self.setup_list = setup_list
        self.remove_list = remove_list
        self.price = price

    def as_dict(self):
        d = super(TransactionArmorerLogMessage, self).as_dict()
        d.update(
            price=self.price,
            setup_list=[item.title for item in self.setup_list],
            remove_list=[item.title for item in self.remove_list],
        )
        return d


class TransactionMechanicLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, setup_list, remove_list, price, **kw):
        super(TransactionMechanicLogMessage, self).__init__(**kw)
        self.setup_list = setup_list
        self.remove_list = remove_list
        self.price = price

    def as_dict(self):
        d = super(TransactionMechanicLogMessage, self).as_dict()
        d.update(
            price=self.price,
            setup_list=[item.title for item in self.setup_list],
            remove_list=[item.title for item in self.remove_list],
        )
        return d


class TransactionMechanicRepairLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, hp, price, **kw):
        super(TransactionMechanicRepairLogMessage, self).__init__(**kw)
        self.hp = hp
        self.price = price

    def as_dict(self):
        d = super(TransactionMechanicRepairLogMessage, self).as_dict()
        d.update(
            hp=self.hp,
            price=self.price,
        )
        return d


class TransactionTunerLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, setup_list, remove_list, price, pont_point, **kw):
        super(TransactionTunerLogMessage, self).__init__(**kw)
        self.setup_list = setup_list
        self.remove_list = remove_list
        self.price = price
        self.pont_point = pont_point

    def as_dict(self):
        d = super(TransactionTunerLogMessage, self).as_dict()
        d.update(
            price=self.price,
            pont_point=self.pont_point,
            setup_list=[item.title for item in self.setup_list],
            remove_list=[item.title for item in self.remove_list],
        )
        return d


class TransactionTraderLogMessage(Message):
    __str_template__ = '<msg::{self.classname} #{self.id}[{self.time_str}] {self.agent}>'

    def __init__(self, buy_list, sell_list, price, **kw):
        super(TransactionTraderLogMessage, self).__init__(**kw)
        self.buy_list = buy_list
        self.sell_list = sell_list
        self.price = price

    def as_dict(self):
        d = super(TransactionTraderLogMessage, self).as_dict()
        d.update(
            price=self.price,
            buy_list=[item.title for item in self.buy_list],
            sell_list=[item.title for item in self.sell_list],
        )
        return d
