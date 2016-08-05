# -*- coding: utf-8 -*-
import logging

log = logging.getLogger(__name__)

from datetime import datetime, timedelta
import time
import math

from tornado.ioloop import IOLoop
import tornado.gen
from uuid import UUID

from sublayers_server.model.events import Event
from sublayers_server.model.units import Mobile
from sublayers_server.model.inventory import ItemState
from sublayers_server.model.map_location import Town
from sublayers_server.model.weapon_objects.effect_mine import SlowMineStartEvent
from sublayers_server.model.weapon_objects.rocket import RocketStartEvent
import sublayers_server.model.messages as messages
from sublayers_server.model.registry.classes.inventory import InventoryField

# todo: перенести логику транзакций из отдельных классов в методы реестровых классов, например итемов (под декоратор)


class TransactionEvent(Event):
    def on_perform(self):
        super(TransactionEvent, self).on_perform()
        # todo: возможно IOLoop.instance().add_callback(callback=self.on_perform_async())
        IOLoop.instance().add_future(future=self.on_perform_async(), callback=self.on_done_perform_async)

    @tornado.gen.coroutine
    def on_perform_async(self):
        pass

    def on_done_perform_async(self, *av, **kw):
        pass


class TransactionActivateItem(TransactionEvent):
    # todo: присвоить правильный __str__template, чтобы было видно какой итем активирован

    def __init__(self, item, inventory, target, **kw):
        super(TransactionActivateItem, self).__init__(**kw)
        self.item = item
        self.inventory = inventory
        self.target = target


class TransactionActivateTank(TransactionActivateItem):
    @tornado.gen.coroutine
    def on_perform_async(self):
        yield super(TransactionActivateTank, self).on_perform_async()

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

        # todo: Сделать у активируемого итема ссылку на итем, в который он трансформируется после активации
        tank_proto = item.example.post_activate_item
        if tank_proto:
            tank_ex = tank_proto.instantiate()
            yield tank_ex.load_references()

            ItemState(server=self.server, time=self.time, example=tank_ex).set_inventory(
                time=self.time, inventory=inventory, position=position)
        else:
            log.warning('Warning! post_activate_item dont set')


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


class TransactionActivateRocket(TransactionActivateItem):
    def on_perform(self):
        super(TransactionActivateRocket, self).on_perform()

        # пытаемся получить инвентарь и итем
        obj = self.server.objects.get(self.target)
        inventory = self.inventory
        item = self.item

        # проверка входных параметров
        if not isinstance(obj, Mobile):
            log.warning('Target obj is not Mobile')
            return

        # Убрать ракету из инвентаря
        #  todo: да, нельзя юзать внутренний метод! Но значит его нужно сделать открытым!
        item._div_item(count=1, time=self.time)

        # запуск
        RocketStartEvent(starter=obj, time=self.time, example_rocket=item.example.generate_obj).post()


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
    def __init__(self, agent, fuel, tank_list, npc_node_hash, **kw):
        super(TransactionGasStation, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.fuel = fuel
        self.tank_list = tank_list
        self.npc_node_hash = npc_node_hash

    @tornado.gen.coroutine
    def on_perform_async(self):
        # todo: Сделать единый механизм проверки консистентности и валидности состояния агента для всех транзакций
        yield super(TransactionGasStation, self).on_perform_async()
        agent = self.agent
        tank_list = self.tank_list
        ex_car = agent.example.car
        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if (npc is None) or (npc.type != 'npc_gas_station') or (ex_car is None):
            log.warning('NPC not found: %s', self.npc_node_hash)
            return  # todo: warning
        if agent.current_location is None or npc not in self.agent.current_location.example.get_npc_list():
            return  # todo: warning
        if not self.fuel:
            self.fuel = 0
        if ex_car.max_fuel < self.fuel + ex_car.fuel:
            return  # todo: warning

        # посчитать суммарную стоимость, если не хватает денег - прервать транзакцию
        sum_fuel = self.fuel
        for item in ex_car.inventory.items:
            if item.position and (item.position in tank_list) and ('empty_fuel_tank' in item.tag_set):
                sum_fuel += item.value_fuel
        sum_fuel = math.ceil(sum_fuel)
        if sum_fuel > agent.example.balance:
            return  # todo: Сообщение о недостатке средств
        agent.example.balance -= sum_fuel
        # проверив всё, можем приступить к заливке топлива
        ex_car.fuel = ex_car.fuel + self.fuel  # наполнить бак

        # Далее заправляем канистры
        old_inventory = ex_car.inventory.items[:]
        ex_car.inventory.items = []
        for item in old_inventory:
            if item.position and (item.position in self.tank_list) and ('empty_fuel_tank' in item.tag_set) and item.full_tank:
                new_tank = item.full_tank.instantiate()
                yield new_tank.load_references()
                new_tank.position = item.position
                ex_car.inventory.items.append(new_tank)
            else:
                ex_car.inventory.items.append(item)
        # ex_car.inventory.placing()

        messages.UserExampleSelfShortMessage(agent=agent, time=self.time).post()

        # Информация о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: правильную стоимость услуг вывести сюда
        # todo: translate
        info_string = u'{}: Заправка {}NC'.format(date_str, str(sum_fuel))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()


class TransactionHangarSell(TransactionEvent):
    def __init__(self, agent, npc_node_hash, **kw):
        super(TransactionHangarSell, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.npc_node_hash = npc_node_hash

    def on_perform(self):
        super(TransactionHangarSell, self).on_perform()

        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if (npc is None) or (npc.type != 'hangar') or (self.agent.example.car is None):
            log.warning('NPC not found: %s', self.npc_node_hash)
            return

        if self.agent.current_location is None or \
           npc not in self.agent.current_location.example.get_npc_list():
            return

        # Отправка сообщения о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: translate
        info_string = u'{}: Продажа {}, {}NC'.format(date_str, self.agent.example.car.title, str(self.agent.example.car.price))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()

        self.agent.example.balance += self.agent.example.car.price
        self.agent.example.car = None
        messages.UserExampleSelfMessage(agent=self.agent, time=self.time).post()


class TransactionHangarBuy(TransactionEvent):
    def __init__(self, agent, car_number, npc_node_hash, **kw):
        super(TransactionHangarBuy, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.car_number = car_number
        self.npc_node_hash = npc_node_hash

    @tornado.gen.coroutine
    def on_perform_async(self):
        yield super(TransactionHangarBuy, self).on_perform_async()

        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if (npc is None) or (npc.type != 'hangar'):
            log.warning('NPC not found: %s', self.npc_node_hash)
            return
        if self.agent.current_location is None or \
           npc not in self.agent.current_location.example.get_npc_list() or \
           len(npc.car_list) <= self.car_number:
            return
        car_proto = npc.car_list[self.car_number]

        agent_balance = self.agent.example.balance
        agent_balance += 0 if self.agent.example.car is None else self.agent.example.car.price
        # todo: refactoring (use inventory to choose car)
        if agent_balance >= car_proto.price:
            # Отправка сообщения о транзакции
            now_date = datetime.now()
            date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
            # todo: translate
            if self.agent.example.car:
                info_string = u'{}: Обмен на {}, {}NC'.format(date_str, car_proto.title,
                                                               str(car_proto.price - self.agent.example.car.price))
            else:
                info_string = u'{}: Покупка {}, {}NC'.format(date_str, car_proto.title, str(-car_proto.price))
            messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                           info_string=info_string).post()

            car_example = car_proto.instantiate()
            yield car_example.load_references()
            car_example.position = self.agent.current_location.example.position
            car_example.last_location = self.agent.current_location.example
            self.agent.example.car = car_example
            self.agent.example.balance = agent_balance - car_proto.price
            messages.UserExampleSelfMessage(agent=self.agent, time=self.time).post()

        else:
            # todo: message to client if not enough money
            pass


class TransactionParkingSelect(TransactionEvent):
    def __init__(self, agent, car_number, npc_node_hash, **kw):
        super(TransactionParkingSelect, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.car_number = car_number
        self.npc_node_hash = npc_node_hash

    def on_perform(self):
        super(TransactionParkingSelect, self).on_perform()
        agent_ex = self.agent.example

        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if (self.car_number is None) or (npc is None) or (npc.type != 'parking'):
            log.warning('NPC not found: %s', self.npc_node_hash)
            return

        car_list = [car for car in agent_ex.get_car_list_by_npc(npc)]

        if self.agent.current_location is None or \
           npc not in self.agent.current_location.example.get_npc_list() or \
           (len(car_list) == 0) or \
           len(car_list) <= self.car_number:
            return

        # Установка цены и может ли пользователь забрать машинка
        summ_for_paying = npc.get_car_price(car_list[self.car_number])

        # Процедура списывания денег и взятия машинки
        if agent_ex.balance >= summ_for_paying:

            # Отправка сообщения о транзакции
            now_date = datetime.now()
            date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
            # todo: translate
            if agent_ex.car:
                info_string = u'{}: Обмен на {}, -{}NC'.format(date_str, car_list[self.car_number].title, str(summ_for_paying))
            else:
                info_string = u'{}: Забрал {}, {}NC'.format(date_str, car_list[self.car_number].title, str(summ_for_paying))
            messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                           info_string=info_string).post()

            if agent_ex.car:
                agent_ex.car.last_parking_npc = npc.node_hash()
                agent_ex.car.date_setup_parking = time.mktime(datetime.now().timetuple())
                agent_ex.car_list.append(agent_ex.car)
            agent_ex.car = car_list[self.car_number]
            agent_ex.car_list.remove(car_list[self.car_number])
            agent_ex.car.last_parking_npc = None

            agent_ex.balance -= summ_for_paying

            messages.UserExampleSelfMessage(agent=self.agent, time=self.time).post()
            messages.ParkingInfoMessage(agent=self.agent, time=self.time, npc_node_hash=npc.node_hash()).post()
            messages.JournalParkingInfoMessage(agent=self.agent, time=self.time).post()
        else:
            # todo: отправить сообщение о том, что недостаточно денег для данного действия
            pass


class TransactionParkingLeave(TransactionEvent):
    def __init__(self, agent, npc_node_hash, **kw):
        super(TransactionParkingLeave, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.npc_node_hash = npc_node_hash

    def on_perform(self):
        super(TransactionParkingLeave, self).on_perform()
        agent_ex = self.agent.example

        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if (npc is None) or (npc.type != 'parking') or (self.agent.example.car is None):
            log.warning('NPC not found: %s', self.npc_node_hash)
            return

        if self.agent.current_location is None or \
           npc not in self.agent.current_location.example.get_npc_list():
            return

        # Отправка сообщения о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: translate
        info_string = u'{}: Оставил {}, 0NC'.format(date_str, agent_ex.car.title)
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()

        agent_ex.car.last_parking_npc = npc.node_hash()
        # todo: сделать через обычный тип Date

        agent_ex.car.date_setup_parking = time.mktime(datetime.now().timetuple())
        agent_ex.car_list.append(agent_ex.car)
        agent_ex.car = None

        messages.UserExampleSelfMessage(agent=self.agent, time=self.time).post()
        messages.ParkingInfoMessage(agent=self.agent, time=self.time, npc_node_hash=npc.node_hash()).post()
        messages.JournalParkingInfoMessage(agent=self.agent, time=self.time).post()


class TransactionArmorerApply(TransactionEvent):
    def __init__(self, agent, armorer_slots, npc_node_hash, **kw):
        super(TransactionArmorerApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.armorer_slots = armorer_slots
        self.npc_node_hash = npc_node_hash

    def on_perform(self):
        super(TransactionArmorerApply, self).on_perform()
        get_flags = '{}_f'.format
        agent = self.agent
        # Получение NPC и проверка валидности совершения транзакции

        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if (npc is None) or (npc.type != 'armorer'):
            log.warning('NPC not found: %s', self.npc_node_hash)
            return
        if agent.current_location is None or npc not in agent.current_location.example.get_npc_list():
            return

        # Проверяем есть ли у агента машинка
        if not agent.example.car:
            return

        # Заполняем буфер итемов
        ex_car = agent.example.car
        armorer_buffer = []
        for item in agent.example.car.inventory.items:
            armorer_buffer.append(item)

        # Проход 1: снимаем старые итемы (проход по экземпляру и скидывание всех различий в armorer_buffer)
        for slot_name, slot_value in ex_car.iter_slots(tags='armorer'):
            old_item = slot_value
            new_item = self.armorer_slots[slot_name]['example']
            if (old_item is not None) and ((new_item is None) or (old_item.node_hash() != new_item['node_hash'])):
                # todo: добавить стоимость демонтажа итема
                armorer_buffer.append(slot_value)
                setattr(ex_car, slot_name, None)

        # Проход 2: устанавливаем новые итемы (проход по armorer_slots и обработка всех ситуаций)
        for slot_name in self.armorer_slots.keys():
            old_item = getattr(ex_car, slot_name)
            new_item = self.armorer_slots[slot_name]['example']

            if new_item is None:  # если в данном слоте должно быть пусто
                continue  # то идём к следующему шагу цикла

            # Если у слота установлено недопустимое направление, то перейти к следующему итему
            if self.armorer_slots[slot_name]['direction'] not in getattr(ex_car, get_flags(slot_name)):
                log.warning('Alarm: Direction for slot<%s> dont access (slot: %s; direction: %s)', slot_name,
                            getattr(ex_car, get_flags(slot_name)), self.armorer_slots[slot_name]['direction'])
                continue

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
                    # Проверка допустимости веса для слота
                    slot_weight = int(getattr(ex_car, get_flags(slot_name)).split('_')[1])
                    item_weight = int(getattr(search_item, 'weight_class'))
                    if slot_weight >= item_weight:
                        armorer_buffer.remove(search_item)
                        search_item.direction = self.armorer_slots[slot_name]['direction']
                        setattr(ex_car, slot_name, search_item)
                    else:
                        log.warning('Alarm: Try to set Item [weight=%s] in Slot<%s> with weight=%s', item_weight,
                                    slot_name, slot_weight)

        # Закидываем буффер в инвентарь
        position = 0
        agent.example.car.inventory.items = []
        for item in armorer_buffer:
            item.position = position
            agent.example.car.inventory.items.append(item)
            position += 1
        messages.UserExampleSelfShortMessage(agent=agent, time=self.time).post()

        # Информация о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: правильную стоимость услуг вывести сюда
        # todo: translate
        info_string = u'{}: Установка на {}, {}NC'.format(date_str, ex_car.title, str(0))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()


class TransactionMechanicApply(TransactionEvent):
    def __init__(self, agent, mechanic_slots, npc_node_hash, **kw):
        super(TransactionMechanicApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.mechanic_slots = mechanic_slots
        self.npc_node_hash = npc_node_hash

    def on_perform(self):
        super(TransactionMechanicApply, self).on_perform()
        agent = self.agent
        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if (npc is None) or (npc.type != 'mechanic'):
            log.warning('NPC not found: %s', self.npc_node_hash)
            return
        if agent.current_location is None or npc not in agent.current_location.example.get_npc_list():
            return

        # Проверяем есть ли у агента машинка
        if not agent.example.car:
            return

        # todo: здесь можно сделать проход по self.mechanic_slots для проверки по тегам.
        for slot_name in self.mechanic_slots.keys():
            new_item_in_slot = self.mechanic_slots[slot_name]['example']
            slot = getattr(agent.example.car.__class__, slot_name)
            proto_item = None
            if new_item_in_slot:
                proto_item = self.agent.server.reg.objects.get_cached(uri=new_item_in_slot['node_hash'])

            if slot and proto_item:
                # Все элементы slot.tags входят в (принадлежат) proto_item.tags
                if not (slot.tags.issubset(proto_item.tag_set)):
                    log.warning('Try to LIE !!!! Error Transaction!!!')
                    log.warning([el for el in slot.tags])
                    log.warning([el for el in proto_item.tag_set])
                    return

        # Заполняем буфер итемов
        ex_car = agent.example.car
        mechanic_buffer = []
        for item in agent.example.car.inventory.items:
            mechanic_buffer.append(item)

        # Проход 1: снимаем старые итемы (проход по экземпляру и скидывание всех различий в mechanic_buffer)
        for slot_name, slot_value in ex_car.iter_slots(tags='mechanic'):
            old_item = slot_value
            new_item = self.mechanic_slots[slot_name]['example']
            if (old_item is not None) and ((new_item is None) or (old_item.node_hash() != new_item['node_hash'])):
                # todo: добавить стоимость демонтажа итема
                mechanic_buffer.append(slot_value)
                setattr(ex_car, slot_name, None)

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
                    setattr(ex_car, slot_name, search_item)

        # Закидываем буффер в инвентарь
        position = 0
        agent.example.car.inventory.items = []
        for item in mechanic_buffer:
            item.position = position
            agent.example.car.inventory.items.append(item)
            position += 1
        messages.UserExampleSelfShortMessage(agent=agent, time=self.time).post()

        # Информация о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: правильную стоимость услуг вывести сюда
        # todo: translate
        info_string = u'{}: Установка на {}, {}NC'.format(date_str, ex_car.title, str(0))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()


class TransactionMechanicRepairApply(TransactionEvent):
    def __init__(self, agent, hp, npc_node_hash, **kw):
        super(TransactionMechanicRepairApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.hp = hp
        self.npc_node_hash = npc_node_hash

    def on_perform(self):
        super(TransactionMechanicRepairApply, self).on_perform()
        agent = self.agent
        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if npc is None:
            log.warning('NPC not found: %s', self.npc_node_hash)
            return
        if agent.current_location is None or npc not in agent.current_location.example.get_npc_list():
            return
        # Проверяем есть ли у агента машинка
        if not agent.example.car:
            return
        ex_car = agent.example.car

        if ex_car.max_hp < ex_car.hp + self.hp:
            log.warning('%s Try to lie in repair transaction', agent)
            return
        # todo: взять цену за ремонт одного HP откуда-то! Здание, NPC, или из самой машинки
        repair_cost = self.hp * 1
        repair_cost = math.ceil(repair_cost)
        if agent.example.balance < repair_cost:
            return
        if repair_cost <= 0:
            log.warning('%s Try to repair with cost = 0 NC', agent)
            return
        ex_car.hp = ex_car.hp + self.hp
        agent.example.balance -= repair_cost

        messages.UserExampleSelfShortMessage(agent=agent, time=self.time).post()

        # todo: Отправить транзакционное сообщение для здания (раньше такого не делали)
        # Отправка сообщения о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: правильную стоимость услуг вывести сюда
        # todo: translate
        info_string = u'{}: Оставил {}, 0NC'.format(date_str, ex_car.title)
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()


class TransactionTunerApply(TransactionEvent):
    def __init__(self, agent, tuner_slots, npc_node_hash, **kw):
        super(TransactionTunerApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.tuner_slots = tuner_slots
        self.npc_node_hash = npc_node_hash

    def on_perform(self):
        super(TransactionTunerApply, self).on_perform()
        agent = self.agent
        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if (npc is None) or (npc.type != 'tuner'):
            log.warning('NPC not found: %s', self.npc_node_hash)
            return
        if agent.current_location is None or npc not in agent.current_location.example.get_npc_list():
            return

        # Проверяем есть ли у агента машинка
        if not agent.example.car:
            return

        # todo: здесь можно сделать проход по self.tuner_slots для проверки по тегам.
        for slot_name in self.tuner_slots.keys():
            new_item_in_slot = self.tuner_slots[slot_name]['example']
            slot = getattr(agent.example.car.__class__, slot_name)
            proto_item = None
            if new_item_in_slot:
                proto_item = self.agent.server.reg.objects.get_cached(uri=new_item_in_slot['node_hash'])

            if slot and proto_item:
                # Все элементы slot.tags входят в (принадлежат) proto_item.tags
                if not (slot.tags.issubset(proto_item.tag_set)):
                    log.warning('Try to LIE !!!! Error Transaction!!!')
                    log.warning([el for el in slot.tags])
                    log.warning([el for el in proto_item.tag_set])
                    return

        # Заполняем буфер итемов
        ex_car = agent.example.car
        tuner_buffer = []
        for item in agent.example.car.inventory.items:
            tuner_buffer.append(item)

        # Проход 1: снимаем старые итемы (проход по экземпляру и скидывание всех различий в tuner_buffer)
        for slot_name, slot_value in ex_car.iter_slots(tags='tuner'):
            old_item = slot_value
            new_item = self.tuner_slots[slot_name]['example']
            if (old_item is not None) and ((new_item is None) or (old_item.node_hash() != new_item['node_hash'])):
                # todo: добавить стоимость демонтажа итема
                tuner_buffer.append(slot_value)
                setattr(ex_car, slot_name, None)

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
                    setattr(ex_car, slot_name, search_item)

        # Закидываем буффер в инвентарь
        position = 0
        agent.example.car.inventory.items = []
        for item in tuner_buffer:
            item.position = position
            agent.example.car.inventory.items.append(item)
            position += 1

        messages.UserExampleSelfShortMessage(agent=agent, time=self.time).post()
        # Информация о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: правильную стоимость услуг вывести сюда
        # todo: translate
        info_string = info_string = u'{}: Установка на {}, {}NC'.format(date_str, ex_car.title, str(0))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()


# todo: переделать ценообразование
class TransactionTraderApply(TransactionEvent):
    def __init__(self, agent, player_table, trader_table, npc_node_hash, **kw):
        super(TransactionTraderApply, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.player_table = [UUID(uid) for uid in player_table]  # this should be a list[{uid: <uid>, node_hash: <node_hash>}]
        self.trader_table = [UUID(uid) for uid in trader_table]  # this should be a list[{uid: <uid>, node_hash: <node_hash>}]
        self.npc_node_hash = npc_node_hash
        self.position = 0

    def _get_position(self):
        self.position += 1
        return self.position - 1

    @tornado.gen.coroutine
    def on_perform_async(self):
        yield super(TransactionTraderApply, self).on_perform_async()
        agent = self.agent
        ex_car = agent.example.car

        trader = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)

        now_date = datetime.now()
        date_str = now_date.replace(year=now_date.year + 100).strftime(messages.NPCTransactionMessage._transaction_time_format)
        tr_msg_list = []

        # Проверяем есть ли у агента машинка
        if (ex_car is None) or (trader is None):
            return  # todo: Как такое может случиться? Может быть здесь должен быть assert?

        # Проверяем находится ли агент в локации с торговцем
        if not (isinstance(agent.current_location, Town) and (trader in agent.current_location.example.get_npc_list())):
            return  # todo: а как может быть иначе? Может быть здесь должно быть исключение?

        trader_price = trader.get_prices(items=ex_car.inventory.items)

        # Заполняем буфер итемов игрока
        buffer_player = [item.uid for item in ex_car.inventory.items]

        # Обход столика игрока: формирование цены и проверка наличия
        price_player = 0
        for item_uid in self.player_table:
            if item_uid not in buffer_player:
                # todo: Нужно тихо записать warning в лог и отфильтровать контрафактные предметы и пометить юзера читером. Не надо помогать хакерам
                # todo: translate
                messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'И кого мы хотим обмануть?').post()
                return

            item = ex_car.inventory.get_item_by_uid(item_uid)
            price_option = trader_price.get(item, None)
            temp_price = (0.01 * item.base_price * price_option['buy']) if price_option and price_option['buy'] else item.base_price  # * item.amount / item.stack_size
            temp_price *= item.amount / item.stack_size
            # todo: translate
            tr_msg_list.append(u'{}: Продажа {}, {}NC'.format(date_str, item.title, str(int(temp_price))))
            price_player += temp_price
            buffer_player.remove(item_uid)

        price_player = round(price_player)

        # Формирование цены итемов для продажи торговцем (обход столика торговца)
        bought_items = []
        price_trader = 0
        for item_uid in self.trader_table:
            item = trader.inventory.get_item_by_uid(item_uid)
            if item is None:
                # todo: Нужно тихо записать warning в лог и отфильтровать контрафактные предметы. Не надо помогать хакерам
                # todo: translate
                messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'И кого мы хотим обмануть?').post()
                return

            price_option = trader_price.get(item, None)
            # * item.amount / item.stack_size
            temp_price = (0.01 * item.base_price * price_option['sale']) if price_option and price_option['sale'] else item.base_price
            # todo: translate
            tr_msg_list.append(u'{}: Покупка {}, {}NC'.format(date_str, item.title, str(int(temp_price))))
            price_trader += temp_price
            # todo: Учитывать количество
            bought_items.append(item)

        price_trader = round(price_trader)

        # Проверка по цене
        if (agent.example.balance + price_player) < price_trader:
            # todo: вариативные реплики
            # todo: translate
            messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'Куда хватаешь? У тебя нет столько денег').post()
            return

        # Проверка по слотам инвентаря
        if (ex_car.inventory_size - len(ex_car.inventory.items) + len(self.player_table)) < len(self.trader_table):
            # todo: вариативные реплики
            # todo: translate
            messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'И куда ты это положишь?').post()
            return

        # Зачисление денег на счёт
        agent.example.balance += price_player - price_trader

        new_inventory = []
        # Списание итемов из инвентаря
        for item in ex_car.inventory.items:
            if item.uid not in self.player_table:
                item.position = self._get_position()
                new_inventory.append(item)

        # Добавление купленных итемов в инвентарь
        for item in bought_items:
            # todo: Брать количество правильно
            # todo : (!) parent instantiate fix
            item_ex = item.parent.instantiate(position=self._get_position(), amount=item.stack_size)
            yield item_ex.load_references()
            new_inventory.append(item_ex)
        ex_car.inventory.items = new_inventory

        for msg in tr_msg_list:
            messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=trader.node_html(),
                                           info_string=msg).post()

        messages.UserExampleSelfShortMessage(agent=agent, time=self.time).post()
        # todo: вариативные реплики
        # todo: translate
        messages.SetupTraderReplica(agent=agent, time=self.time, replica=u'О, да с тобой приятно иметь дело! Приходи ещё.').post()


class TransactionSetRPGState(TransactionEvent):
    def __init__(self, agent, npc_node_hash, skills, buy_skills, perks, **kw):
        super(TransactionSetRPGState, self).__init__(server=agent.server, **kw)
        self.agent = agent
        self.npc_node_hash = npc_node_hash
        self.skills = skills
        self.buy_skills = buy_skills
        self.perks = perks
        self.lvl = 0

    def is_available_perk(self, perk_node_hash):
        perk_rec = self.perks[perk_node_hash]
        ex_agent = self.agent.example
        if ((perk_rec['perk'].driving_req > ex_agent.driving.calc_value(value=self.skills[u'driving'])) or
            (perk_rec['perk'].masking_req > ex_agent.masking.calc_value(value=self.skills[u'masking'])) or
            (perk_rec['perk'].shooting_req > ex_agent.shooting.calc_value(value=self.skills[u'shooting'])) or
            (perk_rec['perk'].leading_req > ex_agent.leading.calc_value(value=self.skills[u'leading'])) or
            (perk_rec['perk'].trading_req > ex_agent.trading.calc_value(value=self.skills[u'trading'])) or
            (perk_rec['perk'].engineering_req > ex_agent.engineering.calc_value(value=self.skills[u'engineering'])) or
            (perk_rec['perk'].level_req > self.lvl)):
            return False

        for perk_id in perk_rec['perk'].perks_req:
            perk_req = self.agent.server.reg[perk_id]
            if not self.perks[perk_req.node_hash()][u'state']:
                return False
        return True

    def on_perform(self):
        # todo: (!!!) REVIEW
        super(TransactionSetRPGState, self).on_perform()
        agent = self.agent

        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if (npc is None) or (npc.type != 'trainer'):
            log.warning('NPC not found: %s', self.npc_node_hash)
            return

        if (agent.current_location is None) or (npc not in agent.current_location.example.get_npc_list()):
            return  # todo: warning

        # Проверяем не превышает ли количество запрашиваемых очков навыков допустимое значение
        lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = agent.example.exp_table.by_exp(exp=agent.stat_log.get_metric('exp'))
        self.lvl = lvl

        max_sp = lvl + agent.example.role_class.start_free_point_skills
        for buy_skill in self.buy_skills.values():
            max_sp += buy_skill

        cur_sp = 0
        for skill in self.skills.values():
            cur_sp += skill

        if cur_sp > max_sp:
            return  # todo: warning

        # Проверяем перки
        max_p = math.floor(lvl / 10) + agent.example.role_class.start_free_point_perks
        cur_p = 0
        for perk_node_hash in self.perks:
            if self.perks[perk_node_hash][u'state']:
                cur_p += 1
        if cur_p > max_p:
            return  # todo: warning

        for perk in agent.server.reg['rpg_settings/perks'].deep_iter():
            self.perks[perk.node_hash()].update(perk=perk)

        for perk_node_hash in self.perks:
            if self.perks[perk_node_hash][u'state'] and not self.is_available_perk(perk_node_hash=perk_node_hash):
                return  # todo: warning

        for buy_skill_name in self.buy_skills:
            if hasattr(self.agent.example, buy_skill_name):
                buy_skill = getattr(self.agent.example, buy_skill_name, None)
                if self.buy_skills[buy_skill_name] < buy_skill.value:
                    return  # todo: warning

        # Считаем стоимость транзакции и проверяем хватает ли денег
        price = 0

        # Проверка факта сброса скилов
        for skill_name in self.skills:
            if hasattr(agent.example, skill_name):
                ex_skill = getattr(agent.example, skill_name, None)
                need_value = ex_skill.value + (self.buy_skills[u'buy_' + skill_name] -
                                               getattr(self.agent.example, 'buy_' + skill_name).value)
                if self.skills[skill_name] < need_value:
                    price += npc.drop_price
                    break

        # Проверка факта сброса перков
        if price == 0:
            for perk in agent.example.perks:
                if not self.perks[perk.node_hash()][u'state']:
                    price += npc.drop_price
                    break

        # Проверка факта покупки очков навыков
        for buy_skill_name in self.buy_skills:
            if hasattr(agent.example, buy_skill_name):
                buy_skill = getattr(agent.example, buy_skill_name, None)
                for val in range(buy_skill.value + 1, self.buy_skills[buy_skill_name] + 1):
                    price += buy_skill.price[val]

        if price > agent.example.balance:
            return  # todo: message "нету денег"
        agent.example.balance -= price

        # Устанавливаем состояние
        self.agent.example.driving.value = self.skills[u'driving']
        self.agent.example.shooting.value = self.skills[u'shooting']
        self.agent.example.masking.value = self.skills[u'masking']
        self.agent.example.leading.value = self.skills[u'leading']
        self.agent.example.trading.value = self.skills[u'trading']
        self.agent.example.engineering.value = self.skills[u'engineering']

        self.agent.example.buy_driving.value = self.buy_skills[u'buy_driving']
        self.agent.example.buy_shooting.value = self.buy_skills[u'buy_shooting']
        self.agent.example.buy_masking.value = self.buy_skills[u'buy_masking']
        self.agent.example.buy_leading.value = self.buy_skills[u'buy_leading']
        self.agent.example.buy_trading.value = self.buy_skills[u'buy_trading']
        self.agent.example.buy_engineering.value = self.buy_skills[u'buy_engineering']

        for perk_node_hash in self.perks:
            perk_rec = self.perks[perk_node_hash]
            if perk_rec[u'state']:
                if perk_rec['perk'] not in agent.example.perks:
                    agent.example.perks.append(perk_rec['perk'])
            else:
                if perk_rec['perk'] in agent.example.perks:
                    agent.example.perks.remove(perk_rec['perk'])

        messages.UserExampleSelfShortMessage(agent=self.agent, time=self.time).post()

        now_date = datetime.now()
        date_str = now_date.replace(year=now_date.year + 100).strftime(messages.NPCTransactionMessage._transaction_time_format)
        info_string = u'{date_str}: Прокачка персонажа, {price} NC'.format(date_str=date_str, price=-price)  # todo: translate
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()
