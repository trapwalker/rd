# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.odm.doc import AbstractDocument
from sublayers_server.model.registry.odm.fields import IntField, FloatField, ListField


class Pair(AbstractDocument):
    k = IntField()
    v = FloatField()


class ExpTable(Root):
    user_exp_table = ListField(base_field=Pair, caption=u'Таблица опыта пользователя')
    car_exp_table = ListField(base_field=Pair, caption=u'Таблица опыта машинки')
    car_exp_price = ListField(base_field=Pair, caption=u'Таблица ценности машинки')
    car_m_exp = ListField(base_field=Pair, caption=u'Таблица модификатора опыта получаемого на машинке')

    def by_exp(self, exp):
        """
        Returns: (current_level, (next_level, next_level_exp), rest_exp)
        """
        table = self.user_exp_table or []
        pairs = sorted(table, key=lambda(k, v): v)
        intervals = zip(
            [(None, None)] + pairs,
            pairs + [(None, None)]
        )
        for a, b in intervals:
            if exp >= a[1] and (exp < b[1] or b[1] is None):
                return a[0], b, (b[1] - exp) if b[1] is not None else None

    def car_lvl_by_exp(self, exp):
        table = self.car_exp_table or []
        sorted_list = sorted(table, key=lambda(k, v): v)
        for index in range(0, len(sorted_list)):
            rec = sorted_list[index]
            if exp < rec[1]:
                return sorted_list[index - 1 if index > 0 else 0][0]

        # Если мы вылезли за пределы таблицы
        return sorted_list[len(sorted_list) - 1][0]

    def agent_skill_points_by_exp(self, exp):
        table = self.user_exp_table or []
        sorted_list = sorted(table, key=lambda(k, v): v)
        for index in range(0, len(sorted_list)):
            rec = sorted_list[index]
            if exp < rec[1]:
                return sorted_list[index - 1 if index > 0 else 0][0]

        # Если мы вылезли за пределы таблицы
        return sorted_list[len(sorted_list) - 1][0]

    def car_exp_price_by_exp(self, exp):
        table = dict(self.car_exp_price) or {}
        lvl = self.car_lvl_by_exp(exp=exp)
        return table[lvl]

    def car_m_exp_by_exp(self, exp):
        table = dict(self.car_m_exp) or {}
        lvl = self.car_lvl_by_exp(exp=exp)
        return table[lvl]
