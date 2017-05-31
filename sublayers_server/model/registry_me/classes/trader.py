# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import random
from sublayers_server.model.events import Event
from sublayers_server.model.messages import TraderInfoMessage
from sublayers_server.model.registry_me.classes.poi import Institution
from sublayers_server.model.registry_me.tree import Subdoc, RegistryLinkField

from mongoengine import IntField, FloatField, ListField, EmbeddedDocumentField


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
    item = RegistryLinkField(
        caption=u'Товар',
        document_type='sublayers_server.model.registry_me.classes.item.Item',
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
    def __init__(self, trader, price_option, price, count, is_infinity, is_lot, item=None):
        self.trader = trader
        self.is_infinity = is_infinity  # флаг бесконечности итема
        self.is_lot = is_lot  # флаг наличия итема
        self.price = price
        self.start_price = price
        self.count = count  # количество в штуках (не стеки)
        self.item = item or price_option.item
        self.price_option = price_option

    # def is_match(self, item):
    #     return item and item.get_ancestor_level(self.item) >= 0

    def __str__(self):
        return 'Price[{}]<{} | {} : {}>'.format(self.price, self.count, self.item.node_hash(), self.price_option.chance)

    def get_price(self, item, agent):  # Возвращает цены (покупки/продажи) итема, рассчитанную по данному правилу
        # todo: добавить влияние навыка торговинга
        return dict(
            buy=self.price * item.base_price * (1 - self.trader.margin),
            sale=self.price * item.base_price * (1 + self.trader.margin),
        )

    def change(self, count, item):  # Вызывается в случае изменения количества итемов
        self.price -= self.price_option.influence * count
        if count < 0:  # значит у торговца купили итемы
            self.price = min(self.price, self.price_option.price_max)
            if self.start_price < 1.0:  # был профицит
                self.price = min(1.0, self.price)
        if count > 0:  # значит торговцу продали итемы
            self.price = max(self.price, self.price_option.price_min)
            if self.start_price >= 1.0:  # был дефицит
                self.price = max(1.0, self.price)

        # если итем бесконечный и он не продаётся сейчас (is_lot=False), то сделать его конечным
        if count > 0 and self.is_infinity and not self.is_lot:
            self.count = 0
            self.is_infinity = False

        # Обновление количества итемов
        if not self.is_infinity:
            self.count += count

        # Определение необходимости создания нового правила
        if self.count > 0 and not self.is_lot:
            if self.item.node_hash() != item.node_hash():  # Это значит, что данная ценовая политика создана для абстрактного итема и нужно создать новую
                self.trader.add_price_option(self, count, item)
            else:
                self.is_lot = True


class Trader(Institution):    
    # Навык торговли торговца 0..300
    trading = IntField(caption=u"Навык торговли", root_default=0)

    # Время полного обновление ассортимента торговца (сек.)
    refresh_time = IntField(caption=u"Время завоза")

    # Маржа (0..1)
    margin = FloatField(caption=u'Коэффициент минимальной цены товара', root_default=0.2)

    ignore_list = ListField(
        caption=u"Список запрещенных товаров",
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.item.Item')
    )
    price_list = ListField(
        caption=u"Набор правил формирования ассортимента",
        field=EmbeddedDocumentField(document_type=PriceOption),
    )
    items = ListField(
        caption=u"Список товаров",
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.item.Item')
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
        # log.debug('Trader {self}.on_refresh'.format(**locals()))
        current_list = []
        self.current_list = current_list
        for price_option in self.price_list:
            current_list.append(
                Price(
                    trader=self,
                    price=price_option.price_min + random.random() * (price_option.price_max - price_option.price_min),
                    count=0,
                    is_infinity=price_option.count_max == 0,
                    is_lot=False,
                    price_option=price_option,
                )
            )

        for item in self.items:
            if item.abstract or self.item_in_ignore_list(item):
                continue  # todo: warning на этапе анализа ямла

            price = self.get_item_price(item)  # todo: Избавиться от двойной проверки итема по игнор-листу
            if not price:
                continue  # todo: warning

            price_option = price.price_option
            # Вычисляем шанс генерации итемов данного лота
            count = 0
            if random.random() <= price_option.chance:
                if price_option.count_max > 0:
                    count = round(price_option.count_min + random.random() * (price_option.count_max - price_option.count_min))
            else:
                continue

            is_infinity = price_option.count_max == 0

            if price.item.node_hash() == item.node_hash():
                price.is_lot = True
                if not is_infinity:
                    price.count += count
            else:
                # Формирование нового правила
                current_list.append(
                    Price(
                        trader=self,
                        price=price_option.price_min + random.random() * (price_option.price_max - price_option.price_min),
                        count=count,
                        is_infinity=is_infinity,
                        is_lot=True,
                        price_option=price_option,
                        item=item
                    )
                )

        self.send_prices(location=event.location, time=event.time)
        # log.debug('Trader {self}.on_refresh END'.format(**locals()))

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
            if item.get_ancestor_level(ignore_item) >= 0:
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
        if not item or self.item_in_ignore_list(item):
            return None
        current_price = None
        current_ancestor_lvl = None
        for price in self.current_list:
            ancestor_lvl = item.get_ancestor_level(price.item)
            if ancestor_lvl >= 0 and (current_ancestor_lvl is None or ancestor_lvl < current_ancestor_lvl):
                current_price = price
                current_ancestor_lvl = ancestor_lvl

        return current_price

    def change_price(self, item, count):
        price = self.get_item_price(item)
        if price:
            price.change(count, item)

    def add_price_option(self, base_price_object, count, item, new_price=False):
        price_option = base_price_object.price_option
        price = base_price_object.price if not new_price else (price_option.price_min + random.random() * (price_option.price_max - price_option.price_min))
        self.current_list.append(
            Price(
                trader=self,
                price=price,
                count=count,
                is_infinity=False,
                is_lot=True,
                price_option=price_option,
                item=item
            )
        )
