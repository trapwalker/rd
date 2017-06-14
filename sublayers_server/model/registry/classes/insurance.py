# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.classes.quest_item import QuestItem
from sublayers_server.model.registry.odm.fields import (
    BooleanField, FloatField, StringField, DateTimeField, EmbeddedDocumentField, ListField, UniReferenceField,
)

import random


class Insurance(QuestItem):
    # Ссылки на example всех городов
    towns = ListField(caption=u"Последние координаты агента",
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.poi.Town'))

    reset_car_exp = BooleanField(caption=u"Сбрасывать ли exp машинки при смерти агента")
    drop_rate_tuner_items = FloatField(caption=u"Шанс выпадения тюнер-итемов")
    drop_rate_mechanic_items = FloatField(caption=u"Шанс выпадения итемов механика")
    drop_rate_cargo_items = FloatField(caption=u"Шанс выпадения итемов груза")

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


class InsuranceBase(Insurance):
    def on_die(self, agent, time):
        # Установить агенту last_town (для перемещения его туда в случае ф5 или в случае обычных страховок)
        towns_examples = self._get_available_towns(agent, time)
        if towns_examples:
            agent.last_town = random.choice(towns_examples)
        else:
            log.warning('For {} with insurance <{}> not found respawn town. Last Town Used.'.format(agent, self))


class InsurancePremium(Insurance):
    def on_die(self, agent, time):
        # Установить агенту last_town (для перемещения его туда в случае ф5 или в случае обычных страховок)
        towns_examples = self._get_available_towns(agent, time)
        if towns_examples:
            if agent.last_town is None or agent.last_town not in towns_examples:
                agent.last_town = random.choice(towns_examples)  # Рандомный город из доступных
        else:
            log.warning('For {} with insurance <{}> not found respawn town. Last Town Used.'.format(agent, self))


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