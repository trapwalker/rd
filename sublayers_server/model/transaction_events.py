# -*- coding: utf-8 -*-
import logging

log = logging.getLogger(__name__)

from sublayers_server.model.events import Event, ReEnterToLocation
from sublayers_server.model.units import Mobile
from sublayers_server.model.inventory import ItemState
from sublayers_server.model.map_location import GasStation, Town
from sublayers_server.model.registry.attr.inv import Inventory as RegistryInventory, InventoryPerksAttribute
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

        tank_proto = self.server.reg['/items/usable/tanks/tank_empty/tank' + str(item.example.value_fuel)]
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
                    new_tank = self.server.reg['/items/usable/tanks/tank_full/tank' + str(dec_val)].instantiate()
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
        # todo: refactoring (use inventory to choose car)

        if self.agent.example.balance >= car_proto.price:
            car_example = car_proto.instantiate()
            car_example.position = self.agent.current_location.example.position
            car_example.last_location = self.agent.current_location.example
            self.agent.example.car = car_example
            self.agent.example.balance -= car_proto.price
            ReEnterToLocation(agent=self.agent, location=self.agent.current_location, time=self.time).post()


class TransactionParkingSelectCar(TransactionEvent):
    def __init__(self, agent, car_number, **kw):
        super(TransactionParkingSelectCar, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.car_number = car_number

    def on_perform(self):
        super(TransactionParkingSelectCar, self).on_perform()

        if not (self.agent.current_location and self.agent.current_location.example.hangar):
            return

        car_list = []
        for car in self.agent.example.car_list:
            car_list.append(car)

        if len(car_list) <= self.car_number:
            return

        if self.agent.example.car:
            car_list.append(self.agent.example.car)
        self.agent.example.car = car_list[self.car_number]
        car_list.remove(car_list[self.car_number])

        self.agent.example.car_list = RegistryInventory()
        for car in car_list:
            self.agent.example.car_list.append(car)

        ReEnterToLocation(agent=self.agent, location=self.agent.current_location, time=self.time).post()
        messages.JournalParkingInfoMessage(agent=self.agent, time=self.time).post()


class TransactionParkingLeaveCar(TransactionEvent):
    def __init__(self, agent, **kw):
        super(TransactionParkingLeaveCar, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(TransactionParkingLeaveCar, self).on_perform()

        if not (self.agent.current_location and self.agent.current_location.example.parking):
            return

        if not self.agent.example.car:
            return

        self.agent.example.car_list.append(self.agent.example.car)
        self.agent.example.car = None
        ReEnterToLocation(agent=self.agent, location=self.agent.current_location, time=self.time).post()
        messages.JournalParkingInfoMessage(agent=self.agent, time=self.time).post()


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
        for slot_name, slot_value in ex_car.iter_slots(tags='armorer'):
            old_item = slot_value
            new_item = self.armorer_slots[slot_name]['example']
            if (old_item is not None) and ((new_item is None) or (old_item.node_hash() != new_item['node_hash'])):
                # todo: добавить стоимость демонтажа итема
                armorer_buffer.append(slot_value)
                ex_car.values[slot_name] = None

        # Проход 2: устанавливаем новые итемы (проход по armorer_slots и обработка всех ситуаций)
        for slot_name in self.armorer_slots.keys():
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


class TransactionMechanicApply(TransactionEvent):
    def __init__(self, agent, mechanic_slots, **kw):
        super(TransactionMechanicApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.mechanic_slots = mechanic_slots

    def on_perform(self):
        super(TransactionMechanicApply, self).on_perform()

        agent = self.agent
        # Проверяем есть ли у агента машинка
        if not agent.example.car:
            return

        # Проверяем находится ли агент в локации с механиком
        if not (isinstance(agent.current_location, Town) and agent.current_location.example.mechanic):
            return

        # todo: здесь можно сделать проход по self.mechanic_slots для проверки по тегам.
        for slot_name in self.mechanic_slots.keys():
            new_item_in_slot = self.mechanic_slots[slot_name]['example']
            slot = getattr(agent.example.car.__class__, slot_name)
            proto_item = None
            if new_item_in_slot:
                proto_item = self.server.reg[new_item_in_slot['node_hash']]

            if slot and proto_item:
                # Все элементы slot.tags входят в (принадлежат) proto_item.tags
                if not (slot.tags.issubset(proto_item.tags)):
                    log.warning('Try to LIE !!!! Error Transaction!!!')
                    log.warning([el for el in slot.tags])
                    log.warning([el for el in proto_item.tags])
                    return

        # Заполняем буфер итемов
        ex_car = agent.example.car
        mechanic_buffer = []
        for item in agent.example.car.inventory:
            mechanic_buffer.append(item)

        # Проход 1: снимаем старые итемы (проход по экземпляру и скидывание всех различий в mechanic_buffer)
        for slot_name, slot_value in ex_car.iter_slots(tags='mechanic'):
            old_item = slot_value
            new_item = self.mechanic_slots[slot_name]['example']
            if (old_item is not None) and ((new_item is None) or (old_item.node_hash() != new_item['node_hash'])):
                # todo: добавить стоимость демонтажа итема
                mechanic_buffer.append(slot_value)
                ex_car.values[slot_name] = None

        # Проход 2: устанавливаем новые итемы (проход по mechanic_slots и обработка всех ситуаций)
        for slot_name in self.mechanic_slots.keys():
            old_item = getattr(ex_car, slot_name)
            new_item = self.mechanic_slots[slot_name]['example']

            if new_item is None:  # если в данном слоте должно быть пусто
                continue  # то идём к следующему шагу цикла

            if old_item is not None:  # поворот итема или отсутствие действия  # todo: возможно убрать
                pass
            else:  # установка итема в слот из mechanic_buffer
                search_item = None
                for item in mechanic_buffer:
                    if item.node_hash() == new_item['node_hash']:
                        search_item = item
                        break
                if search_item is not None:
                    # todo: добавить стоимость монтажа итема
                    mechanic_buffer.remove(search_item)
                    ex_car.values[slot_name] = search_item

        # Закидываем буффер в инвентарь
        position = 0
        agent.example.car.inventory = RegistryInventory()
        for item in mechanic_buffer:
            item.position = position
            agent.example.car.inventory.append(item)
            position += 1
        messages.ExamplesShowMessage(agent=agent, time=self.time).post()


class TransactionTunerApply(TransactionEvent):
    def __init__(self, agent, tuner_slots, **kw):
        super(TransactionTunerApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.tuner_slots = tuner_slots

    def on_perform(self):
        super(TransactionTunerApply, self).on_perform()

        agent = self.agent
        # Проверяем есть ли у агента машинка
        if not agent.example.car:
            return

        # Проверяем находится ли агент в локации с тюнером
        if not (isinstance(agent.current_location, Town) and agent.current_location.example.tuner):
            return

        # todo: здесь можно сделать проход по self.tuner_slots для проверки по тегам.
        for slot_name in self.tuner_slots.keys():
            new_item_in_slot = self.tuner_slots[slot_name]['example']
            slot = getattr(agent.example.car.__class__, slot_name)
            proto_item = None
            if new_item_in_slot:
                proto_item = self.server.reg[new_item_in_slot['node_hash']]

            if slot and proto_item:
                # Все элементы slot.tags входят в (принадлежат) proto_item.tags
                if not (slot.tags.issubset(proto_item.tags)):
                    log.warning('Try to LIE !!!! Error Transaction!!!')
                    log.warning([el for el in slot.tags])
                    log.warning([el for el in proto_item.tags])
                    return

        # Заполняем буфер итемов
        ex_car = agent.example.car
        tuner_buffer = []
        for item in agent.example.car.inventory:
            tuner_buffer.append(item)

        # Проход 1: снимаем старые итемы (проход по экземпляру и скидывание всех различий в tuner_buffer)
        for slot_name, slot_value in ex_car.iter_slots(tags='tuner'):
            old_item = slot_value
            new_item = self.tuner_slots[slot_name]['example']
            if (old_item is not None) and ((new_item is None) or (old_item.node_hash() != new_item['node_hash'])):
                # todo: добавить стоимость демонтажа итема
                tuner_buffer.append(slot_value)
                ex_car.values[slot_name] = None

        # Проход 2: устанавливаем новые итемы (проход по tuner_slots и обработка всех ситуаций)
        for slot_name in self.tuner_slots.keys():
            old_item = getattr(ex_car, slot_name)
            new_item = self.tuner_slots[slot_name]['example']

            if new_item is None:  # если в данном слоте должно быть пусто
                continue  # то идём к следующему шагу цикла

            if old_item is not None:  # поворот итема или отсутствие действия  # todo: возможно убрать
                pass
            else:  # установка итема в слот из tuner_buffer
                search_item = None
                for item in tuner_buffer:
                    if item.node_hash() == new_item['node_hash']:
                        search_item = item
                        break
                if search_item is not None:
                    # todo: добавить стоимость монтажа итема
                    tuner_buffer.remove(search_item)
                    ex_car.values[slot_name] = search_item

        # Закидываем буффер в инвентарь
        position = 0
        agent.example.car.inventory = RegistryInventory()
        for item in tuner_buffer:
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
            price_player += 0.01 * item.base_price * trader_price[item_id].buy  # * item.amount / item.stack_size
            # todo: Учитывать количество
            buffer_player.remove(item_id)

        price_player = round(price_player)

        # Формирование цены итемов для продажи торговцем (обход столика торговца)
        bought_items = []
        price_trader = 0
        for item_id in self.trader_table:
            item = trader.inventory.get_item_by_id(item_id)
            if item is None:
                # todo: Нужно тихо записать warning в лог и отфильтровать контрафактные предметы. Не надо помогать хакерам
                messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'И кого мы хотим обмануть?').post()
                return

            price_trader += 0.01 * item.base_price * trader_price[item_id].sale  # * item.amount / item.stack_size
            # todo: Учитывать количество
            bought_items.append(item)

        price_trader = round(price_trader)

        # Проверка по цене
        if (agent.example.balance + price_player) < price_trader:
            # todo: вариативные реплики
            messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'Куда хватаешь? У тебя нет столько денег').post()
            return

        # Проверка по слотам инвентаря
        if (ex_car.inventory_size - len(ex_car.inventory) + len(self.player_table)) < len(self.trader_table):
            # todo: вариативные реплики
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
        for item in bought_items:
            # todo: Брать количество правильно
            new_inventory.append(item.instantiate(position=self._get_position(), amount=item.stack_size))
        ex_car.inventory = new_inventory

        messages.ExamplesShowMessage(agent=agent, time=self.time).post()
        # todo: вариативные реплики
        messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'О, да с тобой приятно иметь дело! Приходи ещё.').post()


class TransactionSkillApply(TransactionEvent):
    def __init__(self, agent, driving, shooting, masking, leading, trading, engineering, **kw):
        super(TransactionSkillApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.driving = driving
        self.shooting = shooting
        self.masking = masking
        self.leading = leading
        self.trading = trading
        self.engineering = engineering

    def on_perform(self):
        super(TransactionSkillApply, self).on_perform()

        # todo: добавить проверку - находится ли агент в городе где есть Бордель (skill home)

        cur_lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = self.agent.example.experience_table.by_exp(
            exp=self.agent.stat_log.get_metric('exp'))
        rqst_skill_pnt = self.driving + self.shooting + self.masking + self.leading + self.trading + self.engineering

        if (rqst_skill_pnt <= cur_lvl) and (self.agent.example.driving <= self.driving) and \
                (self.agent.example.shooting <= self.shooting) and (self.agent.example.masking <= self.masking) and \
                (self.agent.example.leading <= self.leading) and (self.agent.example.trading <= self.trading) and \
                (self.agent.example.engineering <= self.engineering):
            self.agent.example.driving = self.driving
            self.agent.example.shooting = self.shooting
            self.agent.example.masking = self.masking
            self.agent.example.leading = self.leading
            self.agent.example.trading = self.trading
            self.agent.example.engineering = self.engineering

        messages.RPGStateMessage(agent=self.agent, time=self.time).post()


class TransactionActivatePerk(TransactionEvent):
    def __init__(self, agent, perk_id, **kw):
        super(TransactionActivatePerk, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.perk_id = perk_id

    def on_perform(self):
        super(TransactionActivatePerk, self).on_perform()
        ex_agent = self.agent.example

        activate_perk = None
        for perk in self.agent.server.reg['/rpg_settings/perks'].deep_iter():
            if perk.id == self.perk_id:
                activate_perk = perk
                break

        if (activate_perk is None) or (activate_perk in ex_agent.perks):
            return
        cur_lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = ex_agent.experience_table.by_exp(
            exp=self.agent.stat_log.get_metric('exp'))
        if (activate_perk.driving_req <= ex_agent.driving) and (activate_perk.masking_req <= ex_agent.masking) and \
           (activate_perk.shooting_req <= ex_agent.shooting) and (activate_perk.leading_req <= ex_agent.leading) and \
           (activate_perk.trading_req <= ex_agent.trading) and \
           (activate_perk.engineering_req <= ex_agent.engineering) and (activate_perk.level_req <= cur_lvl):
            for perk in activate_perk.perks_req:
                if self.agent.server.reg[perk] not in ex_agent.perks:
                    return
            ex_agent.perks.append(activate_perk)

        messages.RPGStateMessage(agent=self.agent, time=self.time).post()


class TransactionResetSkills(TransactionEvent):
    def __init__(self, agent, **kw):
        super(TransactionResetSkills, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(TransactionResetSkills, self).on_perform()
        ex_agent = self.agent.example

        # todo: списать деньги

        ex_agent.driving = 0
        ex_agent.shooting = 0
        ex_agent.masking = 0
        ex_agent.leading = 0
        ex_agent.trading = 0
        ex_agent.engineering = 0

        # todo: сделать правильно удаление перков из массива перков
        # ex_agent.perks = InventoryPerksAttribute()

        messages.RPGStateMessage(agent=self.agent, time=self.time).post()


class TransactionResetPerks(TransactionEvent):
    def __init__(self, agent, **kw):
        super(TransactionResetPerks, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(TransactionResetPerks, self).on_perform()
        ex_agent = self.agent.example

        # todo: списать деньги

        # todo: сделать правильно удаление перков из массива перков
        # ex_agent.perks = InventoryPerksAttribute()

        messages.RPGStateMessage(agent=self.agent, time=self.time).post()