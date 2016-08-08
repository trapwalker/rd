# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from sublayers_server.model.registry.tree import Subdoc
from sublayers_server.model.registry.odm.fields import (
    FloatField, ListField, EmbeddedDocumentField, UniReferenceField, StringField,
)
from sublayers_server.model.registry.uri import URI
from collections import namedtuple


class PriceOption(Subdoc):
    item = UniReferenceField(
        caption=u'Товар', #tags='client', #Клиенту не нужно описание итема опции. Он сопоставится с предметом инвентаря.
        reference_document_type='sublayers_server.model.registry.classes.item.Item',
    )
    buy = FloatField(caption=u'Цена покупки торговцем', tags='client')
    sale = FloatField(caption=u'Цена продажи торговцем', tags='client')
    doc = StringField(caption=u'Описание товара от торговца', tags='client')

    def __repr__(self):
        return '{self.__class__.__name__}({self.item}, {self.buy!r}, {self.sale!r}{doctail})'.format(
            self=self,
            doctail=', {!r}'.format(self.doc) if self.doc else '',
        )

    def is_match(self, item):
        """
        Returns True if self.item is not specified or immediate prototype of self.item is equal to @item
        :param item: sublayers_server.model.registry.classes.item.Item
        :return: bool
        """
        if self.item is None:
            return True

        return item and self.item.node_hash() == item.node_hash()


class Price(Subdoc):
    items = ListField(base_field=EmbeddedDocumentField(embedded_document_type=PriceOption), reinst=True)

    def get_item_price(self, item):
        for option in self.items:
            if option.is_match(item):
                return option

    def get_pricelist(self, items):  # todo: review of usages
        price = {}
        for item in items:
            option = self.get_item_price(item)
            if option:
                price[item] = option.as_client_dict()
        return price

    # def __contains__  # todo: extended filtering
    # def __repr__
    # def __str__  # todo: Сделать краткое текстовое представление инвентаря для отладки и логов (алиасы прототипов)
    # def count    # todo: подсчет предметов по классам, тегам, префиксам путей в реестре


class PriceField(EmbeddedDocumentField):
    def __init__(self, embedded_document_type=Price, *av, **kw):
        super(PriceField, self).__init__(embedded_document_type=Price, *av, **kw)
