# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import random
from sublayers_server.model.registry.classes.poi import Institution
from sublayers_server.model.registry.tree import Subdoc
from sublayers_server.model.registry.odm.fields import (
    IntField, FloatField, ListField, EmbeddedDocumentField, UniReferenceField,
)
from sublayers_server.model.events import Event
from sublayers_server.model.messages import TraderInfoMessage

class TraderRefreshEvent(Event):
    def __init__(self, trader, location, **kw):
        super(TraderRefreshEvent, self).__init__(server=location.server, **kw)
        self.trader = trader
        self.location = location

    def on_perform(self):
        super(TraderRefreshEvent, self).on_perform()
        self.trader.on_refresh(event=self)
        TraderRefreshEvent(trader=self.trader, location=self.location, time=self.time + self.trader.refresh_time).post()


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
    def __init__(self, trader, price_option, price, count, is_infinity, is_lot):
        self.trader = trader
        self.is_infinity = is_infinity  # флаг бесконечности итема
        self.is_lot = is_lot  # флаг наличия итема
        self.price = price
        self.count = count  # количество в штуках (не стеки)
        self.item = price_option.item
        self.price_option = price_option

    def is_match(self, item):
        # todo: расширить функцию для возможности работать с ветками
        # if not item:
        #     return
        # if self.item.node_hash() == item.node_hash():
        #     return True
        # if item.is_ancestor(self.item):
        #     return True
        # return False
        #return item and (self.item.node_hash() == item.node_hash() or item.is_ancestor(self.item))
        return item and item.is_ancestor_by_lvl(self.item) >= 0

    def get_price(self, item, agent):  # Возвращает цены (покупки/продажи) итема, рассчитанную по данному правилу
        # todo: добавить влияние навыка торговинга
        return dict(
            buy=self.price * item.base_price * (1 - self.trader.margin),
            sale=self.price * item.base_price * (1 + self.trader.margin),
        )

    def change(self, count):  # Когда было куплено или продавно несколько итемов
        self.price -= self.price_option.influence * count
        if count < 0 and self.price > self.price_option.price_max:  # значит у торговца купили итемы
            self.price = self.price_option.price_max
        if count > 0 and self.price < self.price_option.price_min:  # значит торговцe продали итемы
            self.price = self.price_option.price_min


class Trader(Institution):
    # Навык торговли торговца 0..300
    trading = IntField(caption=u"Навык торговли", default=0)

    # Время полного обновление ассортимента торговца (сек.)
    refresh_time = IntField(caption=u"Время завоза")

    # Маржа (0..1)
    margin = FloatField(caption=u'Коэффициент минимальной цены товара', default=0.2)

    ignore_list = ListField(
        caption=u"Список запрещенных товаров",
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.item.Item')
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

    def get_item_by_uid(self, uid):
        for price in self.current_list:
            if price.item.uid == uid:
                return price
        return None

    def on_refresh(self, event):
        # todo: учитывать ли здесь игнор лист? по идее да, ведь предмет при покупке "просто исчезнет"
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
                        count = round(price_option.count_min + random.random() * (price_option.count_max - price_option.count_min))
            self.current_list.append(
                Price(
                    trader=self,
                    price=price,
                    count=count,
                    is_infinity=is_infinity,
                    is_lot=is_lot,
                    price_option=price_option
                )
            )
        self.send_prices(location=event.location, time=event.time)

    def send_prices(self, location, time):
        for visitor in location.visitors:
            TraderInfoMessage(agent=visitor, time=time, npc_node_hash=self.node_hash()).post()

    def get_trader_assortment(self, agent):
        # todo: учитывать ли здесь игнор лист? по идее да, ведь предмет при покупке "просто исчезнет"
        res = []
        for price in self.current_list:
            if price.is_lot and (price.count > 0 or price.is_infinity) and not self.item_in_ignore_list(price.item):
                res.append(
                    dict(
                        item=price.item.as_client_dict(),
                        count=price.count,
                        infinity=price.is_infinity,
                        price=price.get_price(price.item, agent)
                    ))
        return res

    def item_in_ignore_list(self, item):
        for ignore_item in self.ignore_list:
            if item.is_ancestor_by_lvl(ignore_item) >= 0:
                return True
        return None

    def get_agent_assortment(self, agent, car_items):
        res = []
        for item in car_items:
            if not self.item_in_ignore_list(item):
                price = self.get_item_price(item)
                if price:
                    res.append(
                        dict(
                            item=item.as_client_dict(),
                            price=price.get_price(item, agent),
                            count=item.amount,
                        ))
        return res

    def get_item_price(self, item):
        # info: функция расширена для работы с несколькими правилами. Берёт самое близкое по родителям
        if self.item_in_ignore_list(item):
            return None
        current_price = None
        current_ancestor_lvl = None
        for price in self.current_list:
            if price.is_match(item):
                ancestor_lvl = item.is_ancestor_by_lvl(price.item)
                if ancestor_lvl is not None and (current_ancestor_lvl is None or ancestor_lvl < current_ancestor_lvl):
                    current_price = price
                    current_ancestor_lvl = ancestor_lvl
        return current_price

    # todo: данная функция не должна использоваться - удалить её
    def get_price_list(self, items):
        price = {}
        for item in items:
            option = self.get_item_price(item)
            if option:
                price[item] = option.as_client_dict()
        return price

    def change_price(self, item, count):
        price = self.get_item_price(item)
        if price:
            price.change(count)



























