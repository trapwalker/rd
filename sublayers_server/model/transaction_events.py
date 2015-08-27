# -*- coding: utf-8 -*-
import logging

log = logging.getLogger(__name__)

from sublayers_server.model.events import Event, ReEnterToLocation
from sublayers_server.model.units import Mobile
from sublayers_server.model.inventory import ItemState
from sublayers_server.model.map_location import GasStation, Town
from sublayers_server.model.registry.attr.inv import Inventory as RegistryInventory
from sublayers_server.model.weapon_objects.effect_mine import SlowMineStartEvent

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

        tank_proto = self.server.reg['/items/usable/fuel/tanks/tank_empty/tank' + str(item.example.value_fuel)]
        ItemState(server=self.server, time=self.time, example=tank_proto.instantiate()) \
            .set_inventory(time=self.time, inventory=inventory, position=position)


class TransactionActivateRebuildSet(TransactionActivateItem):
    def on_perform(self):
        super(TransactionActivateRebuildSet, self).on_perform()

        # пытаемся получить инвентарь и итем
        obj = self.server.objects.get(self.target)
        inventory = self.inventory
        item = self.item

        # проверка входных параметров
        if not isinstance(obj, Mobile):
            log.warning('Obj is not Mobile')
            return

        # Убрать один ремкомплект из инвентаря
        item._div_item(count=1, time=self.time)

        # залили в бак топливо
        obj.set_hp(dhp=-item.example.build_points, time=self.time)


class TransactionActivateMine(TransactionActivateItem):
    def on_perform(self):
        super(TransactionActivateMine, self).on_perform()

        # пытаемся получить инвентарь и итем
        obj = self.server.objects.get(self.target)
        inventory = self.inventory
        item = self.item

        # проверка входных параметров
        if not isinstance(obj, Mobile):
            log.warning('Target obj is not Mobile')
            return

        # Убрать мину из инвентаря
        #  todo: да, нельзя юзать внутренний метод! Но значит его нужно сделать открытым!
        item._div_item(count=1, time=self.time)

        # Поставить мину на карту
        SlowMineStartEvent(starter=obj, time=self.time, example_mine=item.example.generate_obj).post()


class TransactionActivateAmmoBullets(TransactionActivateItem):
    # Активация патронов - пройти по всем орудиям и зарядиться в подходящие
    def on_perform(self):
        super(TransactionActivateAmmoBullets, self).on_perform()

        # пытаемся получить инвентарь и итем
        obj = self.server.objects.get(self.target)
        inventory = self.inventory
        item = self.item

        # проверка входных параметров
        if not isinstance(obj, Mobile):
            log.warning('Item is None or Tank is not Fuel')
            return

        # проходим по всем оружиям и если патроны подходят, то заряжаем
        for weapon in obj.weapon_list():
            if item.example.parent in weapon.items_cls_list:
                weapon.set_item(item=item, time=self.time)


class TransactionGasStation(TransactionEvent):
    def __init__(self, agent, fuel, tank_list, **kw):
        super(TransactionGasStation, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.fuel = fuel
        self.tank_list = tank_list

    def on_perform(self):
        super(TransactionGasStation, self).on_perform()

        agent = self.agent
        # Проверяем есть ли у агента машинка
        if not agent.example.car:
            return

        # Проверяем находится ли агент в локации с заправкой
        if not ((isinstance(agent.current_location, Town) and agent.current_location.example.nucoil) or
                isinstance(agent.current_location, GasStation)):
            return

        # Сначала пытаемся наполнить бак
        if self.fuel:
            dec_val = min(agent.example.balance, self.fuel)
            agent.example.balance -= dec_val
            cur_fuel = agent.example.car.fuel + dec_val
            max_fuel = agent.example.car.max_fuel
            if cur_fuel <= max_fuel:
                agent.example.car.fuel = cur_fuel
            else:
                agent.example.car.fuel = max_fuel

        # Далее заправляем столько канистр, сколько сможем
        old_inventory = agent.example.car.inventory
        agent.example.car.inventory = RegistryInventory()
        for item in old_inventory:
            if item.position and (item.position in self.tank_list) and ('empty_fuel_tank' in item.tags):
                dec_val = item.value_fuel
                if dec_val < agent.example.balance:
                    agent.example.balance -= dec_val
                    new_tank = self.server.reg['/items/usable/fuel/tanks/tank_full/tank' + str(dec_val)].instantiate()
                    new_tank.position = item.position
                    agent.example.car.inventory.append(new_tank)
                else:
                    agent.example.car.inventory.append(item)
            else:
                agent.example.car.inventory.append(item)

        messages.GasStationUpdate(agent=agent, time=self.time).post()
        messages.ExamplesShowMessage(agent=agent, time=self.time).post()


class TransactionHangarChoice(TransactionEvent):
    def __init__(self, agent, car_number, **kw):
        super(TransactionHangarChoice, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.car_number = car_number

    def on_perform(self):
        super(TransactionHangarChoice, self).on_perform()

        if not (self.agent.current_location and self.agent.current_location.example.hangar):
            return

        if len(self.agent.current_location.example.hangar.car_list) <= self.car_number:
            return

        car_proto = self.server.reg[self.agent.current_location.example.hangar.car_list[self.car_number]]

        if self.agent.example.balance >= car_proto.price:
            car_example = car_proto.instantiate()
            car_example.position = self.agent.current_location.example.position
            self.agent.example.car = car_example
            self.agent.example.balance -= car_proto.price
            ReEnterToLocation(agent=self.agent, location=self.agent.current_location, time=self.time).post()


class TransactionArmorerApply(TransactionEvent):
    def __init__(self, agent, armorer_slots, **kw):
        super(TransactionArmorerApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.armorer_slots = armorer_slots

    def on_perform(self):
        super(TransactionArmorerApply, self).on_perform()

        agent = self.agent
        # Проверяем есть ли у агента машинка
        if not agent.example.car:
            return

        # Проверяем находится ли агент в локации с оружейником
        if not (isinstance(agent.current_location, Town) and agent.current_location.example.armorer):
            return

        # Заполняем буфер итемов
        ex_car = agent.example.car
        armorer_buffer = []
        for item in agent.example.car.inventory:
            armorer_buffer.append(item)

        # Проход 1: снимаем старые итемы (проход по экземпляру и скидывание всех различий в armorer_buffer)
        for slot_name, slot_value in ex_car.iter_slots():
            old_item = slot_value
            new_item = self.armorer_slots[slot_name]['example']
            if (old_item is not None) and ((new_item is None) or (old_item.node_hash() != new_item['node_hash'])):
                # todo: добавить стоимость демонтажа итема
                armorer_buffer.append(slot_value)
                ex_car.values[slot_name] = None

        # Проход 2: устанавливаем новые итемы (проход по armorer_slots и обработка всех ситуаций)
        for slot_name in self.armorer_slots.keys():
            # slot_name_ascii = unicodedata.normalize('NFKD', slot_name).encode('ascii','ignore')
            old_item = getattr(ex_car, slot_name)
            new_item = self.armorer_slots[slot_name]['example']

            if new_item is None:  # если в данном слоте должно быть пусто
                continue  # то идём к следующему шагу цикла

            if old_item is not None:  # поворот итема или отсутствие действия
                if old_item.direction != self.armorer_slots[slot_name]['direction']:  # поворот
                    # todo: добавить стоимость поворота итема
                    old_item.direction = self.armorer_slots[slot_name]['direction']
            else:  # установка итема в слот из armorer_buffer
                search_item = None
                for item in armorer_buffer:
                    if item.node_hash() == new_item['node_hash']:
                        search_item = item
                        break
                if search_item is not None:
                    # todo: добавить стоимость монтажа итема
                    armorer_buffer.remove(search_item)
                    search_item.direction = self.armorer_slots[slot_name]['direction']
                    ex_car.values[slot_name] = search_item

        # Закидываем буффер в инвентарь
        position = 0
        agent.example.car.inventory = RegistryInventory()
        for item in armorer_buffer:
            item.position = position
            agent.example.car.inventory.append(item)
            position += 1
        messages.ExamplesShowMessage(agent=agent, time=self.time).post()


class TransactionTraderApply(TransactionEvent):
    def __init__(self, agent, player_table, trader_table, **kw):
        super(TransactionTraderApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.player_table = player_table
        self.trader_table = trader_table
        self.position = 0

    def _get_position(self):
        self.position += 1
        return self.position - 1

    def on_perform(self):
        super(TransactionTraderApply, self).on_perform()
        reg = self.server.reg
        agent = self.agent
        ex_car = agent.example.car

        # Проверяем есть ли у агента машинка
        if ex_car is None:
            return  # todo: Как такое может случиться? Может быть здесь должен быть assert?

        # Проверяем находится ли агент в локации с торговцем
        if not (isinstance(agent.current_location, Town) and agent.current_location.example.trader):
            return  # todo: а как может быть иначе? Может быть здесь должно быть исключение?

        trader = agent.current_location.example.trader
        trader_price = trader.get_prices(items=ex_car.inventory)

        # Заполняем буфер итемов игрока
        buffer_player = [item.id for item in ex_car.inventory]

        # Обход столика игрока: формирование цены и проверка наличия
        price_player = 0
        for item_id in self.player_table:
            if item_id not in buffer_player:
                # todo: Нужно тихо записать warning в лог и отфильтровать контрафактные предметы и пометить юзера читером. Не надо помогать хакерам
                messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'И кого мы хотим обмануть?').post()
                return

            item = ex_car.inventory.get_item_by_id(item_id)
            price_player += round(item.base_price * trader_price[item_id][0] * 0.01 * (item.amount / item.stack_size))
            buffer_player.remove(item_id)

        # Формирование цены итемов для продажи торговцем (обход столика торговца)
        price_trader = 0
        for item_id in self.trader_table:
            if trader.inventory.get_item_by_uri(item_id) is None:
                # todo: Нужно тихо записать warning в лог и отфильтровать контрафактные предметы. Не надо помогать хакерам
                messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'И кого мы хотим обмануть?').post()
                return

            price_trader += reg[item_id].base_price * trader_price[item_id][1] * 0.01 * (item.amount / item.stack_size)

        # Проверка по цене
        if (agent.example.balance + price_player) < price_trader:
            messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'Куда хватаешь? У тебя нет столько денег').post()
            return

        # Проверка по слотам инвентаря
        if (ex_car.inventory_size - len(ex_car.inventory) + len(self.player_table)) < len(self.trader_table):
            messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'И куда ты это положишь?').post()
            return

        # Зачисление денег на счёт
        agent.example.balance += price_player - price_trader

        new_inventory = RegistryInventory()
        # Списание итемов из инвентаря
        for item in ex_car.inventory:
            if item.id not in self.player_table:
                item.position = self._get_position()
                new_inventory.append(item)

        # Добавление купленных итемов в инвентарь
        for item_id in self.trader_table:
            item = reg[item_id].instantiate(position=self._get_position(), amount=reg[item_id].stack_size)
            new_inventory.append(item)
        ex_car.inventory = new_inventory

        messages.ExamplesShowMessage(agent=agent, time=self.time).post()
        messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'О, да с тобой приятно иметь дело! Приходи ещё.').post()
