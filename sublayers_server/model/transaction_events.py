# -*- coding: utf-8 -*-
import logging
log = logging.getLogger(__name__)

from sublayers_server.model.events import Event
from sublayers_server.model.units import Mobile
from sublayers_server.model.inventory import ItemState
import sublayers_server.model.messages as messages


class TransactionEvent(Event):
    pass


class TransactionActivateItem(TransactionEvent):
    # todo: присвоить правильный __str__template, чтобы было видно какой итем активирован

    def __init__(self, item, inventory, target, **kw):
        super(TransactionActivateItem, self).__init__(**kw)
        self.item = item
        self.inventory = inventory
        self.target = target


class TransactionActivateTank(TransactionActivateItem):
    def on_perform(self):
        super(TransactionActivateTank, self).on_perform()

        # пытаемся получить инвентарь и итем
        obj = self.server.objects.get(self.target)
        inventory = self.inventory
        item = self.item

        # проверка входных параметров
        if not isinstance(obj, Mobile):
            log.warning('Item is None or Tank is not Fuel')
            return

        # залили в бак топливо
        obj.set_fuel(df=item.example.value_fuel, time=self.time)

        # замена полной канистры на пустую
        position = inventory.get_position(item=item)
        item.set_inventory(time=self.time, inventory=None)

        e_tank_cls = self.server.reg['/items/usable/fuel/tanks/tank_empty/tank' + str(item.example.value_fuel)]
        ItemState(server=self.server, time=self.time, example=e_tank_cls)\
            .set_inventory(time=self.time, inventory=inventory, position=position)


class TransactionGasStation(TransactionEvent):
    def __init__(self, agent, fuel, tank_list, **kw):
        super(TransactionGasStation, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.fuel = fuel
        self.tank_list = tank_list

    def on_perform(self):
        super(TransactionGasStation, self).on_perform()
        fuel = self.fuel
        agent = self.agent
        agent.example.balance -= fuel
        cur_fuel = agent.example.car.fuel + fuel
        max_fuel = agent.example.car.max_fuel
        if cur_fuel <= max_fuel:
            agent.example.car.fuel = cur_fuel
        else:
            agent.example.car.fuel = max_fuel


        # todo: Заправить все канстры из tank_list и заменить их на что-то там
        # todo: Не забыть списать топливо за канистры (расчитать его здесь же)
        messages.ExamplesShowMessage(agent=agent, time=self.time).post()

        messages.GasStationUpdate(agent=agent, time=self.time).post()



