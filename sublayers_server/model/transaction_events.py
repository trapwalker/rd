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
from sublayers_server.model.weapon_objects.effect_mine import SlowMineStartEvent
from sublayers_server.model.weapon_objects.rocket import RocketStartEvent
import sublayers_server.model.messages as messages
from sublayers_server.model.parking_bag import ParkingBagMessage


# todo: перенести логику транзакций из отдельных классов в методы реестровых классов, например итемов (под декоратор)


class TransactionEvent(Event):
    def __init__(self, agent, **kw):
        super(TransactionEvent, self).__init__(server=agent.server, **kw)
        self.agent = agent

    def on_perform(self):
        super(TransactionEvent, self).on_perform()
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

        # todo: Сделать возможным запуск в городе
        if self.agent.current_location is not None:
            return

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

        # todo: Сделать возможным запуск в городе
        if self.agent.current_location is not None:
            return

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

        if self.agent.current_location is not None:
            return

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

        if self.agent.current_location is not None:
            return

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

        if self.agent.current_location is not None:
            return

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


class TransactionTownNPC(TransactionEvent):
    def __init__(self, npc_node_hash, **kw):
        super(TransactionTownNPC, self).__init__(**kw)
        self.npc_node_hash = npc_node_hash

    def get_npc_available_transaction(self, npc_type):
        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        error = False
        if npc is None:
            log.warning('%r NPC not found: %s', self, self.npc_node_hash)
            error = True
        if npc.type != npc_type:
            log.warning('%r NPC not equal type: %s  ==>  %s', self, self.npc_node_hash, npc_type)
            error = True
        if self.agent.current_location is None:
            log.warning('%r Agent not in location', self)
            error = True
        if npc not in self.agent.current_location.example.get_npc_list():
            log.warning('%r Does not math npc (%s) and agent location (%r)', self, self.npc_node_hash, self.agent.current_location)
            error = True
        if error is True:
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=None,
                                       replica=u'У нас возникли трудности c поиском NPC в данной локации.').post()
            return False
        return npc

    def is_agent_available_transaction(self, npc, with_car=True, with_barter=True):
        if with_barter and self.agent.has_active_barter():
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Действие невозможно при активном бартере').post()
            return False
        if with_car and self.agent.example.car is None:
             messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Без автомобиля это невозможно!').post()
             return False
        return True

    def repair_example_inventory(self):
        # Откатываемся к модельному инвентарю
        self.agent.inventory.save_to_example(time=self.time)


class TransactionGasStation(TransactionTownNPC):
    def __init__(self, fuel, tank_list, **kw):
        super(TransactionGasStation, self).__init__(**kw)
        self.fuel = fuel
        self.tank_list = tank_list

    @tornado.gen.coroutine
    def on_perform_async(self):
        # todo: Сделать единый механизм проверки консистентности и валидности состояния агента для всех транзакций
        yield super(TransactionGasStation, self).on_perform_async()

        npc = self.get_npc_available_transaction(npc_type='npc_gas_station')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=True):
            return

        agent = self.agent
        tank_list = self.tank_list
        ex_car = agent.example.car
        total_inventory_list = None if self.agent.inventory is None else self.agent.inventory.example.total_item_type_info()

        if not self.fuel:
            self.fuel = 0
        if ex_car.max_fuel < self.fuel + ex_car.fuel:
            log.warning('%r try to use many fuel (%s), than can', self, self.fuel)
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Недопустимое кол-во топлива!').post()
            return

        # Сохраняем текущий инвентарь в экзампл
        agent.inventory.save_to_example(time=self.time)

        # посчитать суммарную стоимость, если не хватает денег - прервать транзакцию
        sum_fuel = self.fuel
        for item in ex_car.inventory.items:
            if item.position and (item.position in tank_list) and ('empty_fuel_tank' in item.tag_set):
                sum_fuel += item.value_fuel
        sum_fuel = math.ceil(sum_fuel)
        if sum_fuel > agent.balance:
            self.repair_example_inventory()
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'У вас недостаточно стредств!').post()
            return
        agent.change_balance(-sum_fuel, self.time)
        # проверив всё, можем приступить к заливке топлива
        ex_car.fuel = ex_car.fuel + self.fuel  # наполнить бак

        # Далее заправляем канистры
        old_inventory = ex_car.inventory.items[:]
        ex_car.inventory.items = []
        for item in old_inventory:
            if (item.position is not None) and (item.position in self.tank_list) and ('empty_fuel_tank' in item.tag_set) and item.full_tank:
                new_tank = item.full_tank.instantiate()
                yield new_tank.load_references()
                new_tank.position = item.position
                ex_car.inventory.items.append(new_tank)
            else:
                ex_car.inventory.items.append(item)

        messages.UserExampleSelfShortMessage(agent=agent, time=self.time).post()
        agent.reload_inventory(time=self.time, save=False, total_inventory=total_inventory_list)

        # Информация о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: правильную стоимость услуг вывести сюда
        # todo: translate
        info_string = u'{}: Заправка {}NC'.format(date_str, str(sum_fuel))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()


class TransactionHangarSell(TransactionTownNPC):
    def on_perform(self):
        super(TransactionHangarSell, self).on_perform()

        npc = self.get_npc_available_transaction(npc_type='hangar')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=True):
            return

        total_inventory_list = None if self.agent.inventory is None else self.agent.inventory.example.total_item_type_info()

        # Отправка сообщения о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: translate
        info_string = u'{}: Продажа {}, {}NC'.format(date_str, self.agent.example.car.title, str(self.agent.example.car.price))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()

        self.agent.change_balance(self.agent.example.car.price, time=self.time)
        self.agent.example.car = None
        self.agent.reload_inventory(time=self.time, total_inventory=total_inventory_list)

        messages.UserExampleSelfMessage(agent=self.agent, time=self.time).post()


class TransactionHangarBuy(TransactionTownNPC):
    def __init__(self, car_number, **kw):
        super(TransactionHangarBuy, self).__init__(**kw)
        self.car_number = car_number

    @tornado.gen.coroutine
    def on_perform_async(self):
        yield super(TransactionHangarBuy, self).on_perform_async()

        npc = self.get_npc_available_transaction(npc_type='hangar')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=False):
            return

        total_inventory_list = None if self.agent.inventory is None else self.agent.inventory.example.total_item_type_info()
        # Получение NPC и проверка валидности совершения транзакции
        npc = self.agent.server.reg.objects.get_cached(uri=self.npc_node_hash)
        if len(npc.car_list) <= self.car_number:
            log.warning('%r select not support car_number %s for agent %r', self, self.car_number, self.agent)
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Выбран недоступный автомобиль!').post()
            return
        car_proto = npc.car_list[self.car_number]  # todo: Разобраться откуда может быть car_number is None

        agent_balance = self.agent.balance
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

            car_example = car_proto.instantiate(fixtured=False,)
            yield car_example.load_references()
            car_example.position = self.agent.current_location.example.position
            car_example.last_location = self.agent.current_location.example
            self.agent.example.car = car_example
            self.agent.reload_inventory(time=self.time, total_inventory=total_inventory_list)
            self.agent.set_balance(agent_balance - car_proto.price, time=self.time)
            messages.UserExampleSelfMessage(agent=self.agent, time=self.time).post()

        else:
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'У вас недостаточно стредств!').post()


class TransactionParkingSelect(TransactionTownNPC):
    def __init__(self, car_number, **kw):
        super(TransactionParkingSelect, self).__init__(**kw)
        self.car_number = car_number

    def on_perform(self):
        super(TransactionParkingSelect, self).on_perform()

        npc = self.get_npc_available_transaction(npc_type='parking')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=False):
            return

        agent = self.agent
        agent_ex = self.agent.example
        total_inventory_list = None if self.agent.inventory is None else self.agent.inventory.example.total_item_type_info()

        car_list = [car for car in agent_ex.get_car_list_by_npc(npc)]

        if self.car_number is None or len(car_list) <= self.car_number or len(car_list) == 0:
            log.warning('%r select not support car_number %s for agent %r', self, self.car_number, self.agent)
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Выбран недоступный автомобиль!').post()
            return

        # Установка цены и может ли пользователь забрать машинка
        summ_for_paying = npc.get_car_price(car_list[self.car_number])

        # Процедура списывания денег и взятия машинки
        if agent.balance >= summ_for_paying:
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
            self.agent.reload_inventory(time=self.time, total_inventory=total_inventory_list)
            agent_ex.car_list.remove(car_list[self.car_number])
            agent_ex.car.last_parking_npc = None

            agent.change_balance(-summ_for_paying, self.time)

            messages.UserExampleSelfMessage(agent=self.agent, time=self.time).post()
            messages.ParkingInfoMessage(agent=self.agent, time=self.time, npc_node_hash=npc.node_hash()).post()
            messages.JournalParkingInfoMessage(agent=self.agent, time=self.time).post()
        else:
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'У вас недостаточно стредств!').post()


class TransactionParkingLeave(TransactionTownNPC):
    def on_perform(self):
        super(TransactionParkingLeave, self).on_perform()

        npc = self.get_npc_available_transaction(npc_type='parking')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=True):
            return
        agent_ex = self.agent.example
        total_inventory_list = None if self.agent.inventory is None else self.agent.inventory.example.total_item_type_info()

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
        self.agent.reload_inventory(time=self.time, total_inventory=total_inventory_list)

        messages.UserExampleSelfMessage(agent=self.agent, time=self.time).post()
        messages.ParkingInfoMessage(agent=self.agent, time=self.time, npc_node_hash=npc.node_hash()).post()
        messages.JournalParkingInfoMessage(agent=self.agent, time=self.time).post()


class TransactionArmorerApply(TransactionTownNPC):
    def __init__(self, armorer_slots, **kw):
        super(TransactionArmorerApply, self).__init__(**kw)
        self.armorer_slots = armorer_slots

    def on_perform(self):
        super(TransactionArmorerApply, self).on_perform()

        npc = self.get_npc_available_transaction(npc_type='armorer')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=True):
            return

        get_flags = '{}_f'.format
        agent = self.agent
        total_inventory_list = None if self.agent.inventory is None else self.agent.inventory.example.total_item_type_info()

        # Сохраняем текущий инвентарь в экзампл и удаляем его с клиента
        agent.inventory.save_to_example(time=self.time)

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
        agent.reload_inventory(time=self.time, save=False, total_inventory=total_inventory_list)

        # Информация о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: правильную стоимость услуг вывести сюда
        # todo: translate
        info_string = u'{}: Установка на {}, {}NC'.format(date_str, ex_car.title, str(0))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()


class TransactionMechanicApply(TransactionTownNPC):
    def __init__(self, mechanic_slots, **kw):
        super(TransactionMechanicApply, self).__init__(**kw)
        self.mechanic_slots = mechanic_slots

    def on_perform(self):
        super(TransactionMechanicApply, self).on_perform()

        npc = self.get_npc_available_transaction(npc_type='mechanic')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=True):
            return

        agent = self.agent
        total_inventory_list = None if self.agent.inventory is None else self.agent.inventory.example.total_item_type_info()

        # Сохраняем текущий инвентарь в экзампл
        agent.inventory.save_to_example(time=self.time)

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
                    self.repair_example_inventory()
                    messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Что-то пошло не так!').post()
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
        agent.reload_inventory(time=self.time, save=False, total_inventory=total_inventory_list)

        # Информация о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: правильную стоимость услуг вывести сюда
        # todo: translate
        info_string = u'{}: Установка на {}, {}NC'.format(date_str, ex_car.title, str(0))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()


class TransactionMechanicRepairApply(TransactionTownNPC):
    def __init__(self, hp, **kw):
        super(TransactionMechanicRepairApply, self).__init__(**kw)
        self.hp = hp

    def on_perform(self):
        super(TransactionMechanicRepairApply, self).on_perform()
        npc = self.get_npc_available_transaction(npc_type='mechanic')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=True):
            return

        agent = self.agent
        ex_car = agent.example.car
        if ex_car.max_hp < ex_car.hp + self.hp:
            log.warning('%s Try to lie in repair transaction', agent)
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Недопустимое значение ремонта!').post()
            return
        # todo: взять цену за ремонт одного HP откуда-то! Здание, NPC, или из самой машинки
        repair_cost = self.hp * 1
        repair_cost = math.ceil(repair_cost)
        if agent.balance < repair_cost:
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'У вас недостаточно стредств!').post()
            return
        if repair_cost <= 0:
            log.warning('%s Try to repair with cost = 0 NC', agent)
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Недопустимое значение ремонта!').post()
            return
        ex_car.hp = ex_car.hp + self.hp
        agent.change_balance(-repair_cost, self.time)

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


class TransactionTunerApply(TransactionTownNPC):
    def __init__(self, tuner_slots, **kw):
        super(TransactionTunerApply, self).__init__(**kw)
        self.tuner_slots = tuner_slots

    def on_perform(self):
        super(TransactionTunerApply, self).on_perform()

        npc = self.get_npc_available_transaction(npc_type='tuner')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=True):
            return
        agent = self.agent
        total_inventory_list = None if self.agent.inventory is None else self.agent.inventory.example.total_item_type_info()

        # Сохраняем текущий инвентарь в экзампл
        agent.inventory.save_to_example(time=self.time)

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
                    self.repair_example_inventory()
                    messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Что-то пошло не так!').post()
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
        agent.reload_inventory(time=self.time, save=False, total_inventory=total_inventory_list)

        # Информация о транзакции
        now_date = datetime.now()
        date_str = datetime.strftime(now_date.replace(year=now_date.year + 100), messages.NPCTransactionMessage._transaction_time_format)
        # todo: правильную стоимость услуг вывести сюда
        # todo: translate
        info_string = info_string = u'{}: Установка на {}, {}NC'.format(date_str, ex_car.title, str(0))
        messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                       info_string=info_string).post()


class TransactionTraderApply(TransactionTownNPC):
    def __init__(self, player_table, trader_table, **kw):
        super(TransactionTraderApply, self).__init__(**kw)
        self.player_table = [dict(uid=UUID(rec['uid']), count=rec['count']) for rec in player_table]  # this should be a list[{uid: <uid>, node_hash: <node_hash>}]
        self.trader_table = [dict(uid=UUID(rec['uid']), count=rec['count']) for rec in trader_table]  # this should be a list[{uid: <uid>, node_hash: <node_hash>}]
        self.position = 0

    @tornado.gen.coroutine
    def on_perform_async(self):
        yield super(TransactionTraderApply, self).on_perform_async()

        npc = self.get_npc_available_transaction(npc_type='trader')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=True):
            return

        agent = self.agent
        ex_car = agent.example.car
        total_inventory_list = None if self.agent.inventory is None else self.agent.inventory.example.total_item_type_info()

        now_date = datetime.now()
        date_str = now_date.replace(year=now_date.year + 100).strftime(messages.NPCTransactionMessage._transaction_time_format)
        tr_msg_list = []

        # Сохраняем инвентарь в екзампл
        agent.inventory.save_to_example(time=self.time)
        total_items_buy_sale = []
        # Обход столика игрока ,списывание итемов и расчет навара
        sale_price = 0  # цена того что игрок продает
        for table_rec in self.player_table:
            item_ex = ex_car.inventory.get_item_by_uid(uid=table_rec['uid'])

            # Проверяем есть ли итем в нужном количестве
            if (item_ex is None) or (item_ex.amount < table_rec['count']):
                self.repair_example_inventory()
                messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'{} отсутствует в нужном количестве!'.format(item_ex.title)).post()
                return

            # Проверяем покупает ли торговец этот итем и по чем (расчитываем навар игрока)
            price = npc.get_item_price(item=item_ex)
            if price is None:
                self.repair_example_inventory()
                messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'{} не продаётся и не покупается!'.format(item_ex.title)).post()
                return
            item_sale_price = price.get_price(item=item_ex, agent=agent)['buy'] * float(table_rec['count']) / float(item_ex.stack_size)
            sale_price += item_sale_price

            # todo: текстовое описание на клиенте не будет совпадать с реальным, так как округление не так работает
            tr_msg_list.append(u'{}: Продажа {}, {}NC'.format(date_str, item_ex.title, str(int(item_sale_price))))

            item_ex.amount -= table_rec['count']
            if item_ex.amount == 0:
                ex_car.inventory.items.remove(item_ex)

            total_items_buy_sale.append((item_ex, table_rec['count']))
        sale_price = math.floor(sale_price)  # Навар игрока округляется до меньшего

        # Обход столика торговца, зачисление итемов и расчет стоимости
        buy_price = 0  # цена того что игрок покупает
        for table_rec in self.trader_table:
            price = npc.get_item_by_uid(uid=table_rec['uid'])

            # Проверяем есть ли итем в нужном количестве
            if (price is None) or (not price.is_lot) or ((price.count < table_rec['count']) and not price.is_infinity):
                self.repair_example_inventory()
                messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'{} отсутствует в нужном количестве!'.format(price.item.title)).post()
                return

            # Проверяем покупает ли торговец этот итем и по чем (расчитываем навар игрока)
            item_buy_price = price.get_price(item=price.item, agent=agent)['sale'] * float(table_rec['count']) / float(price.item.stack_size)
            buy_price += item_buy_price
            # todo: текстовое описание на клиенте не будет совпадать с реальным, так как округление не так работает
            tr_msg_list.append(u'{}: Покупка {}, {}NC'.format(date_str, price.item.title, str(int(item_buy_price))))

            # Добавляем итемы в инвентарь игрока
            ex_car.inventory.add(item=price.item, count=table_rec['count'])
            total_items_buy_sale.append((price.item, -table_rec['count']))
        buy_price = math.ceil(buy_price)

        # Проверяем не переполнился ли инвентарь игрока (если надо, то пробуем уплотнить)
        if len(ex_car.inventory.items) > ex_car.inventory.size:
            ex_car.inventory.packing()
        if len(ex_car.inventory.items) > ex_car.inventory.size:
            self.repair_example_inventory()
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Недостаточно свободных слотов!').post()
            return

        # Проверяем хватает ли денег на все про все
        if (agent.balance + sale_price - buy_price) < 0:
            self.repair_example_inventory()
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'У вас недостаточно стредств!').post()
            return
        agent.change_balance(sale_price - buy_price, self.time)

        # Перезагружаем модельный инвентарь
        agent.reload_inventory(time=self.time, save=False, total_inventory=total_inventory_list)

        # Изменение цен у торговца
        for item_pair in total_items_buy_sale:
            item, count = item_pair
            npc.change_price(item, count)

        # рассылка новых цен всем агентам
        npc.send_prices(location=agent.current_location, time=self.time)

        for msg in tr_msg_list:
            messages.NPCTransactionMessage(agent=self.agent, time=self.time, npc_html_hash=npc.node_html(),
                                           info_string=msg).post()
        # Мессадж завершения транзакции
        messages.TraderClearMessage(agent=agent, time=self.time, npc_node_hash=npc.node_hash()).post()


class TransactionSetRPGState(TransactionTownNPC):
    def __init__(self, skills, buy_skills, perks, **kw):
        super(TransactionSetRPGState, self).__init__(**kw)
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

        npc = self.get_npc_available_transaction(npc_type='trainer')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=False):
            return
        agent = self.agent

        # Проверяем не превышает ли количество запрашиваемых очков навыков допустимое значение
        lvl, (nxt_lvl, nxt_lvl_exp), rest_exp = agent.example.exp_table.by_exp(exp=agent.example.exp)
        self.lvl = lvl

        max_sp = lvl + agent.example.role_class.start_free_point_skills
        for buy_skill in self.buy_skills.values():
            max_sp += buy_skill

        cur_sp = 0
        for skill in self.skills.values():
            cur_sp += skill

        if cur_sp > max_sp:
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Текущее значение навыков недопустимо!').post()
            return  # todo: warning

        # Проверяем перки
        max_p = math.floor(lvl / 10) + agent.example.role_class.start_free_point_perks
        cur_p = 0
        for perk_node_hash in self.perks:
            if self.perks[perk_node_hash][u'state']:
                cur_p += 1
        if cur_p > max_p:
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Текущее значение перков недопустимо!').post()
            return  # todo: warning

        for perk in agent.server.reg['rpg_settings/perks'].deep_iter():
            self.perks[perk.node_hash()].update(perk=perk)

        for perk_node_hash in self.perks:
            if self.perks[perk_node_hash][u'state'] and not self.is_available_perk(perk_node_hash=perk_node_hash):
                messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Данный перк нельзя прокачать %s!'.format(perk_node_hash)).post()
                return  # todo: warning

        for buy_skill_name in self.buy_skills:
            if hasattr(self.agent.example, buy_skill_name):
                buy_skill = getattr(self.agent.example, buy_skill_name, None)
                if self.buy_skills[buy_skill_name] < buy_skill.value:
                    messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Недопустимое значение покупных навыков!').post()
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

        if price > agent.balance:
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'У вас недостаточно стредств!').post()
            return
        agent.change_balance(-price, self.time)

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


class BagExchangeStartEvent(TransactionTownNPC):
    def __init__(self, car_uid, **kw):
        super(BagExchangeStartEvent, self).__init__(**kw)
        self.car_uid = None if car_uid is None else UUID(car_uid)

    def on_perform(self):
        super(BagExchangeStartEvent, self).on_perform()

        npc = self.get_npc_available_transaction(npc_type='parking')
        if npc is None or not self.is_agent_available_transaction(npc=npc, with_car=True, with_barter=False):
            return

        agent = self.agent

        if self.car_uid is None:
            agent.reload_parking_bag(new_example_inventory=None, time=self.time)
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Выбрана недоступная машинка!').post()
            return

        car_list = [car for car in agent.example.get_car_list_by_npc(npc)]

        target_car_ex = None
        for car in car_list:
            if car.uid == self.car_uid:
                target_car_ex = car
        if not target_car_ex:
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'Выбрана недоступная машинка!').post()
            return

        # Списать деньги за стоянку, обновить время установки машинки на стоянку
        car_price = npc.get_car_price(target_car_ex)
        if agent.balance < car_price:
            messages.NPCReplicaMessage(agent=self.agent, time=self.time, npc=npc,
                                     replica=u'У вас недостаточно стредств!').post()
            return
        agent.change_balance(-car_price, self.time)
        target_car_ex.date_setup_parking = time.mktime(datetime.now().timetuple())

        # Создать инвентарь
        agent.reload_parking_bag(new_example_inventory=target_car_ex.inventory, time=self.time)

        # Отправить месадж для подготовки вёрстки (создание дива) инвентаря
        ParkingBagMessage(agent=agent, parking_bag=agent.parking_bag, parking_npc=npc, car_title=target_car_ex.title,
                          time=self.time).post()
        # Отправить сообщения об обноволении
        # todo: Сделать сообщение-обновление цен машинок у парковщика
        messages.ParkingInfoMessage(agent=self.agent, time=self.time, npc_node_hash=npc.node_hash()).post()
        messages.JournalParkingInfoMessage(agent=self.agent, time=self.time).post()
