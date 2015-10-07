# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute


class ExpTable(Root):
    table = Attribute(caption=u'Узловые точки', doc=u'Таблица узловых точек шкалы опыта')

    def by_exp(self, exp):
        """
        Returns: (current_level, (next_level, next_level_exp), rest_exp)
        """
        table = self.table or {}
        pairs = sorted(table.items(), key=lambda (k, v): v)
        intervals = zip(
            [(None, None)] + pairs,
            pairs + [(None, None)]
        )
        for a, b in intervals:
            if exp >= a[1] and (exp < b[1] or b[1] is None):
                return a[0], b, (b[1] - exp) if b[1] is not None else None
