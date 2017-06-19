# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.classes.quest_item import QuestItem
from sublayers_server.model.registry_me.classes.item import SlotItem, SlotLock
from sublayers_server.model.registry_me.tree import Subdoc, EmbeddedNodeField, RegistryLinkField

from mongoengine import BooleanField, FloatField, StringField, DateTimeField, ListField, EmbeddedDocumentField

import random


class Insurance(QuestItem):
    # Ссылки на example всех городов
    towns = ListField(
        caption=u"Последние координаты агента",
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.poi.Town'),
    )

    # Это поле должно быть иногда равно None
    car = EmbeddedNodeField(
        document_type='sublayers_server.model.registry_me.classes.mobiles.Car',
        caption=u"Автомобиль по страховке",
    )

    icon_nukeoil = StringField(caption=u'URL icon_nukeoil', tags={'client'})
    icon_right_panel = StringField(caption=u'URL icon_right_panel', tags={'client'})

    def add_to_inventory(self, inventory, event):
        # удалить другой итем-страховки
        items = inventory.items[:]
        for item in items:
            if isinstance(item, Insurance):
                inventory.items.remove(item)
        super(Insurance, self).add_to_inventory(inventory, event)

    def del_from_inventory(self, inventory, event):
        super(Insurance, self).del_from_inventory(inventory, event)
        # добавить итем базовой страховки
        base_insurance = event.server.reg.get('/registry/items/quest_item/insurance/base').instantiate()
        inventory.items.append(base_insurance)

    # Список городов, в которые можно принять пользователя, упорядоченный по расстоянию
    def _get_available_towns(self, agent, time):
        from sublayers_server.model.map_location import Town as ModelTown  # todo: import fix
        towns = [town for town in ModelTown.get_towns() if town.example in self.towns]
        position = agent.profile.position.as_point()
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
            if 'cargo' in item.tag_set:
                if random.random() <= base_cargo_drop:
                    drop_items.append(item)
            else:
                if random.random() <= base_other_drop:
                    drop_items.append(item)
        return drop_items

    def prolong(self, delta):
        if self.deadline:
            self.deadline += delta


class InsuranceBase(Insurance):
    def on_die(self, agent, time):
        # Установить агенту last_town (для перемещения его туда в случае ф5 или в случае обычных страховок)
        towns_examples = self._get_available_towns(agent, time)
        if towns_examples:
            agent.profile.last_town = random.choice(towns_examples)
        else:
            log.warning('For {} with insurance <{}> not found respawn town. Last Town Used.'.format(agent, self))

    def get_drop_items(self, car):
        items = []
        # Итемы инвентаря
        for item in car.inventory.items:
            items.append(item)
        # Итемы тюнера, механика, оружейника
        for slot_name, slot_value in car.iter_slots(tags={'mechanic', 'tuner', 'armorer'}):
            if slot_value is not None and isinstance(slot_value, SlotItem) and not isinstance(slot_value, SlotLock):
                items.append(slot_value)
        return items

    def on_car_die(self, agent, car, is_bang, time):
        self.car = None
        agent.profile.set_balance(time=time, delta=car.price)
        items = self.get_drop_items(car=car)
        return self.random_filter_drop(items=items, is_bang=is_bang)


class InsurancePremium(Insurance):
    def on_die(self, agent, time):
        # Установить агенту last_town (для перемещения его туда в случае ф5 или в случае обычных страховок)
        towns_examples = self._get_available_towns(agent, time)
        if towns_examples:
            if agent.profile.last_town is None or agent.profile.last_town not in towns_examples:
                agent.profile.last_town = random.choice(towns_examples)  # Рандомный город из доступных
        else:
            log.warning('For {} with insurance <{}> not found respawn town. Last Town Used.'.format(agent, self))

    def get_drop_items(self, car):
        items = []
        # Итемы инвентаря
        for item in car.inventory.items:
            items.append(item)
        car.inventory.items = []
        # Итемы тюнера, механика, оружейника
        slots_values = [(slot_name, slot_value) for slot_name, slot_value in car.iter_slots(tags={'mechanic', 'tuner'})
                        if slot_value is not None and isinstance(slot_value, SlotItem) and not isinstance(slot_value, SlotLock)]
        for slot_name, slot_value in slots_values:
            setattr(car, slot_name, None)
            items.append(slot_value)
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
                agent.profile.last_town = town
                return

    def get_respawn_towns(self, agent, time):
        # Метод для вывода списка доступных городов для респавна на клиенте
        return self._get_available_towns(agent, time)

    def get_drop_items(self, car):
        items = []
        inventory_items = []  # Те итемы, которые останутся в инвентаре потом
        for item in car.inventory.items:
            if 'cargo' in item.tag_set:
                items.append(item)
            else:
                inventory_items.append(item)
        car.inventory.items = inventory_items
        return items


class InsuranceQuick(Insurance):
    def get_drop_items(self, car):
        items = car.inventory.items
        car.inventory.items = []
        return items

    def on_car_die(self, agent, car, is_bang, time):
        self.car = None
        return self.get_drop_items(car=car)
