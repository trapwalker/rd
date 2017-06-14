# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.quest_item import QuestItem
from sublayers_server.model.registry.odm.fields import (
    BooleanField, FloatField, StringField, DateTimeField, EmbeddedDocumentField, ListField, UniReferenceField,
)

from sublayers_server.model.registry.classes.item import SlotItem, SlotLock

import random


class Insurance(QuestItem):
    # Ссылки на example всех городов
    towns = ListField(caption=u"Последние координаты агента",
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.poi.Town'))

    # Это поле должно быть иногда равно None
    car = EmbeddedDocumentField(
        embedded_document_type='sublayers_server.model.registry.classes.mobiles.Car',
        caption=u"Автомобиль по страховке",
    )

    def add_to_inventory(self, inventory, event):
        # todo: удалить другой итем-страховки
        super(self, Insurance).add_to_inventory(inventory, event)
        pass

    def del_from_inventory(self, inventory, event):
        # todo: добавить итем базовой страховки
        super(self, Insurance).del_from_inventory(inventory, event)
        pass

    # Список городов, в которые можно принять пользователя, упорядоченный по расстоянию
    def _get_available_towns(self, agent, time):
        from sublayers_server.model.map_location import Town as ModelTown  # todo: import fix
        towns = [town for town in ModelTown.get_towns() if town.example in self.towns]
        position = agent.position.as_point()
        towns.sort(key=lambda town: town.position(time).distance(position))
        if towns:
            return [town.example for town in towns]
        # log.warning('For {} with insurance <{}> not found respawn town. Last Town Used.'.format(agent, self))
        return []

    def get_respawn_towns(self, agent, time):
        # Метод для вывода списка доступных городов для респавна на клиенте
        return [agent.last_town]

    def on_die(self, agent, time):
        # Установить агенту last_town (для перемещения его туда в случае ф5 или в случае обычных страховок)
        pass

    def set_last_town(self, agent, time, town_node_hash):
        # Установка города, если это позволяет страховка
        pass

    def on_car_die(self, agent, car, is_bang, time):
        pass

    def random_filter_drop(self, items, is_bang):
        # При убийстве без взрыва (доезжание) – доля дропа айтемов – 50%, груза - 100%
        # При убийстве со взрывом – доля дропа айтемов – 25%, груза – 50%
        drop_items = []
        base_cargo_drop = 0.5 if is_bang else 1.0   # Если взрыв, то шанс дропа груза 50%, иначе 100%
        base_other_drop = 0.25 if is_bang else 0.5  # Если взрыв, то шанс итемов 25%, иначе 50%

        for item in items:
            if 'cargo' in item.tag_set or True:  # todo: убрать True!
                if random.random() <= base_cargo_drop:
                    drop_items.append(item)
            else:
                if random.random() <= base_other_drop:
                    drop_items.append(item)
        return drop_items


class InsuranceBase(Insurance):
    def on_die(self, agent, time):
        # Установить агенту last_town (для перемещения его туда в случае ф5 или в случае обычных страховок)
        towns_examples = self._get_available_towns(agent, time)
        if towns_examples:
            agent.last_town = random.choice(towns_examples)
        else:
            log.warning('For {} with insurance <{}> not found respawn town. Last Town Used.'.format(agent, self))

    def get_drop_items(self, car):
        items = []
        # Итемы инвентаря
        for item in car.inventory.items:
            items.append(item)
        # Итемы тюнера, механика, оружейника
        for slot_name, slot_value in car.iter_slots(tags='mechanic tuner armorer'):
            if slot_value is not None and isinstance(slot_value, SlotItem) and not isinstance(slot_value, SlotLock):
                items.append(slot_value)
        return items

    def on_car_die(self, agent, car, is_bang, time):
        self.car = None
        agent.set_balance(time=time, delta=car.price)
        items = self.get_drop_items(car=car)
        return self.random_filter_drop(items=items, is_bang=is_bang)


class InsurancePremium(Insurance):
    def on_die(self, agent, time):
        # Установить агенту last_town (для перемещения его туда в случае ф5 или в случае обычных страховок)
        towns_examples = self._get_available_towns(agent, time)
        if towns_examples:
            if agent.last_town is None or agent.last_town not in towns_examples:
                agent.last_town = random.choice(towns_examples)  # Рандомный город из доступных
        else:
            log.warning('For {} with insurance <{}> not found respawn town. Last Town Used.'.format(agent, self))

    def get_drop_items(self, car):
        items = []
        # Итемы инвентаря
        items = self.drop_cargo_inventory_items(car)
        # Итемы тюнера, механика, оружейника
        slots_values = [(slot_name, slot_value) for slot_name, slot_value in car.iter_slots(tags='mechanic tuner')
                        if slot_value is not None and isinstance(slot_value, SlotItem) and not isinstance(slot_value, SlotLock)]
        for slot_name, slot_value in slots_values:
            setattr(car, slot_name, None)
            items.append(slot_value)
        return items

    def drop_cargo_inventory_items(self, car):
        items = []
        inventory_items = []  # Те итемы, которые останутся в инвентаре потом
        for item in car.inventory.items:
            if 'cargo' in item.tag_set or True:  # todo: убрать True!
                items.append(item)
            else:
                inventory_items.append(item)
        car.inventory.items = inventory_items
        return items

    def on_car_die(self, agent, car, is_bang, time):
        items = self.get_drop_items(car=car)
        car.set_exp(time=time, value=0)
        car.hp = car.max_hp
        car.fuel = car.max_fuel
        self.car = car
        return self.random_filter_drop(items=items, is_bang=is_bang)


class InsuranceShareholder(InsurancePremium):
    # Выбор города сработает как и в InsurancePremium, просто будет возможность дополнительно установить перед респом
    def set_last_town(self, agent, time, town_node_hash):
        # Установка города, если это позволяет страховка
        towns_examples = self._get_available_towns(agent, time)
        for town in towns_examples:
            if town.node_hash() == town_node_hash:
                agent.last_town = town
                return

    def get_respawn_towns(self, agent, time):
        # Метод для вывода списка доступных городов для респавна на клиенте
        return self._get_available_towns(agent, time)

    def get_drop_items(self, car):
        return self.drop_cargo_inventory_items(car)
