# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Root, Subdoc
from sublayers_server.model.registry.odm.fields import IntField, FloatField, ListField, EmbeddedDocumentField


class Pair(Subdoc):
    k = IntField()
    v = FloatField()


class ExpTable(Root):
    user_exp_table = ListField(
        caption=u'Таблица опыта пользователя',
        base_field=EmbeddedDocumentField(embedded_document_type=Pair),
    )
    car_exp_table = ListField(
        caption=u'Таблица опыта машинки',
        base_field=EmbeddedDocumentField(embedded_document_type=Pair),
    )
    car_exp_price = ListField(
        caption=u'Таблица ценности машинки',
        base_field=EmbeddedDocumentField(embedded_document_type=Pair),
    )
    car_m_exp = ListField(
        caption=u'Таблица модификатора опыта получаемого на машинке',
        base_field=EmbeddedDocumentField(embedded_document_type=Pair),
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

    def car_lvl_by_exp(self, exp):
        return self.table_slice(self.car_exp_table or [], exp)[0]

    def agent_skill_points_by_exp(self, exp):
        # Пока что здесь используется user_exp_table. Потом, наверно, будет другая таблица.
        return self.table_slice(self.user_exp_table or [], exp)[0]

    def car_exp_price_by_exp(self, exp):
        table = {pair.k: pair.v for pair in self.car_exp_price or []}
        lvl = self.car_lvl_by_exp(exp=exp)
        return table[lvl]  # todo: проверять на пустоту и на исключения

    def car_m_exp_by_exp(self, exp):
        table = {pair.k: pair.v for pair in self.car_m_exp or []}
        lvl = self.car_lvl_by_exp(exp=exp)
        return table[lvl]  # todo: проверять на пустоту и на исключения
