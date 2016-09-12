# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import random, math
from sublayers_server.model.registry.classes.poi import Institution
from sublayers_server.model.registry.odm.fields import (
    IntField, FloatField, StringField, ListField, UniReferenceField, EmbeddedDocumentField,
)
from sublayers_server.model.registry.classes.price import PriceField
from sublayers_server.model.registry.classes.inventory import InventoryField
from itertools import chain


from sublayers_server.model.registry.tree import Subdoc
from sublayers_server.model.registry.odm.fields import (
    FloatField, ListField, EmbeddedDocumentField, UniReferenceField, StringField,
)


class PriceOption(Subdoc):
    # Товар сгенерируется только если URI не абстрактный
    item = UniReferenceField(
        caption=u'Товар',
        reference_document_type='sublayers_server.model.registry.classes.item.Item',
    )

    # Вероятность появления товара при завозе, если 0 то товар не появится в ассортименте, но проавило будет
    # сгенермровано и торговец будет расчитывать цену покупки по нему
    chance = FloatField(caption=u'Вероятность появления товара')

    # Количественные границы количества товара которое может сгенерироваться при завозе. если count_max = 0,
    # то количество товара бесконечно.
    count_min = IntField(caption=u'Минимальное количество товара')
    count_max = IntField(caption=u'Мaксимальное количество товара')

    # Допустимые границы цены товара при завозе. Обозначают множитель для номинальной цены товара.
    # Требования:
    #   - price_min <= price_max,
    #   - значения не могут быть отрицательными,
    price_min = FloatField(caption=u'Коэффициент минимальной цены товара')
    price_max = FloatField(caption=u'Коэффициент максимальной цены товара')

    # Коэффициент скорости изменения цены от количетва проданного/купленного товара
    influence = FloatField(caption=u'Коэффициент скорости измениния цены товара')


class Price(object):
    def __init__(self, trader, price_options, price, count, is_infinity, is_lot):
        self.trader = trader
        self.is_infinity = is_infinity  # флаг бесконечности итема
        self.is_lot = is_lot  # флаг наличия итема
        self.price = price
        self.count = count
        self.price_options = price_options

    def is_match(self, item):
        # todo: расширить функцию для возможности работать с ветками
        return item and (self.price_options.item.node_hash() == item.node_hash())

    def as_client_dict(self, item):
        # todo: добавить влияние навыка торговинга
        return dict(
            item=item.as_client_dict(),
            buy=self.price * item.base_price * (1 - self.trader.margin),
            sale=self.price * item.base_price * (1 + self.trader.margin),
        )


class Trader(Institution):
    # Навык торговли торговца 0..300
    trading = IntField(caption=u"Навык торговли", default=0)

    # Время полного обновление ассортимента торговца (сек.)
    refresh_time = IntField(caption=u"Время завоза")

    # Маржа (0..1)
    margin = FloatField(caption=u'Коэффициент минимальной цены товара', default=0.2)

    ignore_list = ListField(
        caption=u"Список запрещенных товаров",
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.items.Item')
    )
    price_list = ListField(
        caption=u"Набор правил формирования ассортимента",
        base_field=EmbeddedDocumentField(embedded_document_type=PriceOption),
    )

    @property
    def current_list(self):
        return self.__dict__.setdefault('_current_list', [])

    @current_list.setter
    def current_list(self, value):
        self.__dict__['_current_list'] = value

    def on_refresh(self, event):
        self.current_list = []
        for price_option in self.price_list:
            price = price_option.price_min + random.random() * (price_option.price_max - price_option.price_min)
            count = 0
            is_infinity = price_option.count_max == 0
            is_lot = False
            if not price_option.item.abstract:
                # Вычисляем шанс генерации итемов данного лота
                if random.random() <= price_option.chance:
                    is_lot = True
                    if price_option.count_max > 0:
                        count = round(price_option.count_min + random.random() * (price_option.count_min - price_option.count_max))
            self.current_list.append(
                Price(
                    trader=self,
                    price_options=price_option,
                    price=price,
                    count=count,
                    is_infinity=is_infinity,
                    is_lot=is_lot
                )
            )
        self.send_prices(event=event)

    def send_prices(self, event):
        pass

    def get_item_price(self, item):
        # todo: расширить функцию для возможности работать с ветками (подходят несколько правил)
        for price in self.current_list:
            if price.is_match(item):
                return price
        return None

    def get_price_list(self, items):
        price = {}
        for item in items:
            option = self.get_item_price(item)
            if option:
                price[item] = option.as_client_dict()
        return price



























