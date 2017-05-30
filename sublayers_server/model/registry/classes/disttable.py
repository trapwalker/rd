# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Root, Subdoc
from sublayers_server.model.registry.odm.fields import UniReferenceField, IntField, FloatField, ListField, EmbeddedDocumentField


class DistTownPair(Subdoc):
    town1 = UniReferenceField(
        caption=u"Текущая локация",
        reference_document_type='sublayers_server.model.registry.classes.poi.Town',
    )
    town2 = UniReferenceField(
        caption=u"Текущая локация",
        reference_document_type='sublayers_server.model.registry.classes.poi.Town',
    )
    distance = FloatField()


class DistTable(Root):
    table = ListField(
        caption=u'Таблица расстояний между локациями',
        base_field=EmbeddedDocumentField(embedded_document_type=DistTownPair),
    )

    def get_distance(self, town1, town2):
        for pair in self.table:
            if ((pair.town1 == town1) and (pair.town2 == town2)) or ((pair.town1 == town2) and (pair.town2 == town1)):
                return pair.distance
        return 0
