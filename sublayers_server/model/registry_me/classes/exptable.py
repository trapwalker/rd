# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import (
    Node, 
    IntField, FloatField, ListField, EmbeddedDocumentField, EmbeddedDocument,
)


class Pair(EmbeddedDocument):
    k = IntField()
    v = FloatField()

    def __str__(self):
        return '{}:{}'.format(self.k, self.v)


class ExpTable(Node):
    user_exp_table = ListField(
        caption=u'Таблица опыта пользователя',
        field=EmbeddedDocumentField(document_type=Pair),
    )
    car_exp_table = ListField(
        caption=u'Таблица опыта машинки',
        field=EmbeddedDocumentField(document_type=Pair),
    )
    car_exp_price = ListField(
        caption=u'Таблица ценности машинки',
        field=EmbeddedDocumentField(document_type=Pair),
    )
    car_m_exp = ListField(
        caption=u'Таблица модификатора опыта получаемого на машинке',
        field=EmbeddedDocumentField(document_type=Pair),
    )

    @classmethod
    def table_slice(cls, table, value):
        """
        Returns: (current_k, (next_k, next_v), rest_v)
        """
        pairs = sorted(table, key=lambda(pair): pair.v)
        intervals = zip(
            [Pair(k=None, v=None)] + pairs,
            pairs + [Pair(k=None, v=None)]
        )
        for a, b in intervals:
            if value >= a.v and (value < b.v or b.v is None):
                return a.k, (b.k, b.v), (b.v - value) if b.v is not None else None

    def by_exp(self, exp):
        """
        Returns: (current_level, (next_level, next_level_exp), rest_exp)
        """
        return self.table_slice(self.user_exp_table or [], exp)

    def user_exp_by_lvl(self, lvl):
        for pair in self.user_exp_table:
            if pair.k == lvl:
                return pair.v
        return 0

    def car_lvl_by_exp(self, exp):
        lvl = self.table_slice(self.car_exp_table or [], exp)[0]
        assert lvl is not None and lvl >= 0, 'Lvl = {} exp={}  not found   in table_keys: {}'.format(lvl, exp, self.car_exp_table)
        return lvl

    def agent_skill_points_by_exp(self, exp):
        # Пока что здесь используется user_exp_table. Потом, наверно, будет другая таблица.
        skill_points =  self.table_slice(self.user_exp_table or [], exp)[0]
        assert skill_points is not None and skill_points >= 0, 'skill_points = {} exp={}  not found   in table_keys: {}'.format(skill_points, exp, self.car_exp_table)
        return skill_points

    def car_exp_price_by_exp(self, exp):
        table = {pair.k: pair.v for pair in self.car_exp_price or []}
        lvl = self.car_lvl_by_exp(exp=exp)
        res = table.get(lvl, None)
        assert res is not None and res >= 0, 'Res = {}  Lvl = {} exp={}  table: {}'.format(res, lvl, exp, table)
        return res

    def car_m_exp_by_exp(self, exp):
        table = {pair.k: pair.v for pair in self.car_m_exp or []}
        lvl = self.car_lvl_by_exp(exp=exp)
        res = table.get(lvl, None)
        assert res is not None and res >= 0, 'Res = {}  Lvl = {} exp={}  table: {}'.format(res, lvl, exp, table)
        return res
