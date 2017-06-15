# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry_me.tree import Node, Subdoc, EmbeddedNodeField, RegistryLinkField
from mongoengine import StringField, ListField, FloatField, EmbeddedDocumentField, BooleanField


class DistTownPair(Subdoc):
    town1 = RegistryLinkField(
        caption=u"Текущая локация",
        document_type='sublayers_server.model.registry_me.classes.poi.Town',
    )
    town2 = RegistryLinkField(
        caption=u"Текущая локация",
        document_type='sublayers_server.model.registry_me.classes.poi.Town',
    )
    distance = FloatField()


# TODO: ##OPTIMIZE
class DistTable(Node):
    table = ListField(
        caption=u'Таблица расстояний между локациями',
        field=EmbeddedDocumentField(document_type=DistTownPair),
    )

    def get_distance(self, town1, town2):
        for pair in self.table:
            if ((pair.town1 == town1) and (pair.town2 == town2)) or ((pair.town1 == town2) and (pair.town2 == town1)):
                return pair.distance
        return 0
        # todo: ##REVIEW Почему 0 по умолчанию?!
