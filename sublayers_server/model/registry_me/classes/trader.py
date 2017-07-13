# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import random
from sublayers_common.ctx_timer import Timer, T
from sublayers_server.model.events import Event
from sublayers_server.model.messages import TraderInfoMessage, TraderAgentAssortmentMessage
from sublayers_server.model.registry_me.classes.poi import Institution
from sublayers_server.model.registry_me.tree import (
    Subdoc, 
    IntField, FloatField, ListField, EmbeddedDocumentField,
    RegistryLinkField,
)


class TraderRefreshEvent(Event):
    def __init__(self, trader, location, **kw):
        super(TraderRefreshEvent, self).__init__(server=location.server, **kw)
        self.trader = trader
        self.location = location

    def on_perform(self):
        super(TraderRefreshEvent, self).on_perform()
        with Timer() as tm:
            # log.debug('Trader {!r} refresh start'.format(self.trader))
            self.trader.on_refresh(event=self)
            log.debug('Trader {!r} refresh duration is: {:.3f}s; interval {}s'.format(self.trader, tm.duration, self.trader.refresh_time))
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
        self._item_client_dict = self.item.as_assortment_dict()  # self.item.as_client_dict()

    # def is_match(self, item):
    #     return item and item.get_ancestor_level(self.item) >= 0

    def __str__(self):
        return 'Price[{}]<{} | {} : {}>'.format(self.price, self.count, self.item.node_hash(), self.price_option.chance)

    def get_item_dict(self):
        return self._item_client_dict

    def get_price(self, item, skill_effect):  # Возвращает цены (покупки/продажи) итема, рассчитанную по данному правилу
        return dict(
            buy=self.price * item.base_price * (1 - self.trader.margin * skill_effect),
            sale=self.price * item.base_price * (1 + self.trader.margin * skill_effect),
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
    refresh_time = IntField(caption=u"Интервал завоза (c, по умолчанию или 0 - никогда)")

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

    def __init__(self, *av, **kw):
        super(Trader, self).__init__(*av, **kw)
        self._current_list = []
        self._items_options = []  # list of dict(item, price_record)
        self._price_options = []  # list of dict(PriceOption, [Price])
        self._is_init = False

    def init_prices(self):
        self._items_options = []  # list of dict(item, price_record)
        self._price_options = []  # list of dict(PriceOption, [Price])

        for price_option in self.price_list:
            self._price_options.append(dict(price_option=price_option, prices=[]))

        for item in self.items:
            if item.abstract or self.item_in_ignore_list(item):
                continue  # todo: warning на этапе анализа ямла

            current_price = None
            current_ancestor_lvl = None
            for record in self._price_options:
                price = record['price_option']
                ancestor_lvl = item.get_ancestor_level(price.item)
                if ancestor_lvl >= 0 and (current_ancestor_lvl is None or ancestor_lvl < current_ancestor_lvl):
                    current_price = record
                    current_ancestor_lvl = ancestor_lvl

            if current_price and current_ancestor_lvl is not None:
                self._items_options.append(dict(
                    item=item,
                    price_record=current_price,
                ))

        self._is_init = True

    def get_item_by_uid(self, uid):
        for price in self._current_list:
            if price.item.uid == uid:
                return price
        return None

    def on_refresh(self, event):
        # log.debug('Trader {self!r}.on_refresh'.format(**locals()))

        if not self._is_init:
            self.init_prices()

        current_list = []
        self._current_list = current_list
        for record in self._price_options:
            price_option = record['price_option']
            p = Price(
                trader=self,
                price=price_option.price_min + random.random() * (price_option.price_max - price_option.price_min),
                count=0,
                is_infinity=price_option.count_max == 0,
                is_lot=False,
                price_option=price_option,
            )
            current_list.append(p)
            record['prices'] = [p]

        for record in self._items_options:
            item = record['item']
            price_record = record['price_record']

            price = self.get_item_price2(item, price_record=price_record)
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
                p = Price(
                    trader=self,
                    price=price_option.price_min + random.random() * (price_option.price_max - price_option.price_min),
                    count=count,
                    is_infinity=is_infinity,
                    is_lot=True,
                    price_option=price_option,
                    item=item,
                )
                current_list.append(p)
                price_record['prices'].append(p)

        if event is not None:
            self.send_prices(location=event.location, time=event.time)
        # log.debug('Trader {self!r}.on_refresh END'.format(**locals()))

    def send_prices(self, location, time):
        h = self.node_hash()
        for visitor in location.visitors:
            TraderInfoMessage(agent=visitor, time=time, npc_node_hash=h).post()
            TraderAgentAssortmentMessage(agent=visitor, time=time, npc_node_hash=h).post()

    def get_agent_skill_effect(self, agent):
        agent_trading = agent.example.profile.trading.calc_value() + \
                        agent.example.profile.get_quest_skill_modifier().get('trading', 0)
        return 1 - (agent_trading - self.trading + 100) / 200.

    def get_trader_assortment(self, agent):
        # todo: учитывать ли здесь игнор лист? по идее да, ведь предмет при покупке "просто исчезнет"
        res = []
        skill_effect = self.get_agent_skill_effect(agent)
        for price in self._current_list:
            if price.is_lot and (price.count > 0 or price.is_infinity): # and not self.item_in_ignore_list(price.item):
                res.append(
                    dict(
                        item=price.get_item_dict(),
                        count=price.count,
                        infinity=price.is_infinity,
                        price=price.get_price(item=price.item, skill_effect=skill_effect),
                    ))
        return res

    def item_in_ignore_list(self, item):
        for ignore_item in self.ignore_list:
            if item.get_ancestor_level(ignore_item) >= 0:
                return True
        return None

    def get_agent_assortment(self, agent, car_items):
        res = []
        skill_effect = self.get_agent_skill_effect(agent)
        for item in car_items:
            price = self.get_item_price2(item, for_agent=True)
            if price:
                res.append(
                    dict(
                        item=item.as_assortment_dict(),
                        price=price.get_price(item=item, skill_effect=skill_effect),
                        count=item.amount,
                    ))
        return res

    def get_item_price(self, item):
        # info: функция расширена для работы с несколькими правилами. Берёт самое близкое по родителям
        if not item or self.item_in_ignore_list(item):
            return None
        current_price = None
        current_ancestor_lvl = None
        for price in self._current_list:
            ancestor_lvl = item.get_ancestor_level(price.item)
            if ancestor_lvl >= 0 and (current_ancestor_lvl is None or ancestor_lvl < current_ancestor_lvl):
                current_price = price
                current_ancestor_lvl = ancestor_lvl

        return current_price

    def get_item_price2(self, item, price_record=None, for_agent=False):
        # info: функция расширена для работы с несколькими правилами. Берёт самое близкое по родителям
        if not item or self.item_in_ignore_list(item):
            return None

        if not price_record:
            if for_agent:
                current_ancestor_lvl = None
                for record in self._price_options:
                    price_option = record['price_option']
                    pr_opt_item = price_option.item
                    ancestor_lvl = item.get_ancestor_level(pr_opt_item)
                    if ancestor_lvl >= 0 and (current_ancestor_lvl is None or ancestor_lvl < current_ancestor_lvl):
                        current_ancestor_lvl = ancestor_lvl
                        price_record = record
            else:
                for record in self._items_options:
                    if record['item'] == item:
                        price_record = record['price_record']
                        break

        assert price_record

        current_price = None
        current_ancestor_lvl = None
        for price in price_record['prices']:
            ancestor_lvl = item.get_ancestor_level(price.item)
            if ancestor_lvl >= 0 and (current_ancestor_lvl is None or ancestor_lvl < current_ancestor_lvl):
                current_price = price
                current_ancestor_lvl = ancestor_lvl

        return current_price

    def change_price(self, item, count):
        price = self.get_item_price2(item)
        if price:
            price.change(count, item)

    def add_price_option(self, base_price_object, count, item, new_price=False):
        price_option = base_price_object.price_option
        price = base_price_object.price if not new_price else (price_option.price_min + random.random() * (price_option.price_max - price_option.price_min))
        self._current_list.append(Price(
            trader=self,
            price=price,
            count=count,
            is_infinity=False,
            is_lot=True,
            price_option=price_option,
            item=item,
        ))
