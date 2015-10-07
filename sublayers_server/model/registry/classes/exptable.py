# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute


class ExpTable(Root):
    table = Attribute(caption=u'Узловые точки', doc=u'Таблица узловых точек шкалы опыта')
