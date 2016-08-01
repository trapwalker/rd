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
        caption=u'Товар',
        reference_document_type='sublayers_server.model.registry.classes.item.Item',
    )
    buy = FloatField(caption=u'Цена покупки торговцем')
    sale = FloatField(caption=u'Цена продажи торговцем')
    doc = StringField(caption=u'Описание товара от торговца')

    def __repr__(self):
        return '{self.__class__.__name__}({self.uri!r}, {self.buy!r}, {self.sale!r}{doctail})'.format(
            self=self,
            doctail=', {!r}'.format(self.doc) if self.doc else '',
        )


PriceBid = namedtuple('PriceBid', 'buy sale')


class Price(Subdoc):
    items = ListField(base_field=EmbeddedDocumentField(embedded_document_type=PriceOption))

    def get_item_price(self, item):
        for option in self.items:
            if option.item == item:  # todo: eq method
                return option

    def get_pricelist(self, items):
        price = {}
        for item in items:
            assert not isinstance(item, basestring)
            if isinstance(item, URI):
                item = item.resolve()  # todo: (!!!!)

            option = self.get_item_price(item)
            if option:
                price[item.id] = PriceBid(option.buy, option.sale)
        return price

    # def __contains__  # todo: extended filtering
    # def __repr__
    # def __str__  # todo: Сделать краткое текстовое представление инвентаря для отладки и логов (алиасы прототипов)
    # def count    # todo: подсчет предметов по классам, тегам, префиксам путей в реестре


class PriceField(EmbeddedDocumentField):
    def __init__(self, embedded_document_type=Price, *av, **kw):
        super(PriceField, self).__init__(embedded_document_type=Price, *av, **kw)
