# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import random
from sublayers_server.model.events import Event
from sublayers_server.model.registry_me.classes.poi import Institution
from sublayers_server.model.registry_me.tree import (Subdoc, IntField, FloatField, ListField, EmbeddedDocumentField,
                                                     RegistryLinkField,)
from sublayers_server.model.messages import HangarAddLotMessage, HangarDelLotMessage
from tornado.template import Loader


class CarLotRefreshEvent(Event):
    def __init__(self, car_lot, **kw):
        super(CarLotRefreshEvent, self).__init__(server=car_lot.hangar._location.server, **kw)
        self.car_lot = car_lot

    def on_perform(self):
        super(CarLotRefreshEvent, self).on_perform()
        self.car_lot.refresh_event = None
        self.car_lot.hangar.del_car_lot(car_lot=self.car_lot, time=self.time)


class CarGroup(Subdoc):
    count = IntField(caption=u'Количество машин этой группы в завозе')
    car_list = ListField(
        caption=u"Машины данной группы",
        field=RegistryLinkField(document_type='sublayers_server.model.registry_me.classes.mobiles.Car'),
    )

    def get_car(self):
        car_proto = random.choice(self.car_list)
        car_example = car_proto.instantiate()
        car_example.randomize_params()
        car_example.name_car = car_example.title.en
        return car_example


class CarLot(object):
    template_table = None
    template_img = None

    def __init__(self, car_example, group, hangar, time):
        self.car_example = car_example
        self.group = group
        self.hangar = hangar
        self.refresh_event = CarLotRefreshEvent(time=time + hangar.lot_timeout, car_lot=self).post()
        self.lot_message = dict()

    def get_message_info(self, agent):
        if not agent.connection or agent.connection._finished:
            if agent.connection and agent.connection._finished:
                log.warning('CarLot %s try send for %s, but Connection Finished', self, agent)
            return None
        lot_locale = '{}'.format(agent.connection and agent.connection.user_lang or 'en')
        lot_info = self.lot_message.get(lot_locale, None)
        if lot_info is None:
            namespace = agent.connection.get_template_namespace()

            if CarLot.template_table:
                template_table = CarLot.template_table
            else:
                template_table = Loader("templates/location").load("car_info_table.html")
                CarLot.template_table = template_table

            if CarLot.template_img:
                template_img = CarLot.template_img
            else:
                template_img = Loader("templates/location").load("car_info_img_ext.html")
                CarLot.template_img = template_img

            lot_info = dict(
                car=self.car_example.as_client_dict(),
                html_car_table=template_table.generate(car=self.car_example, agent=None, **namespace),
                html_car_img=template_img.generate(car=self.car_example, **namespace),
            )
            self.lot_message[lot_locale] = lot_info
        return lot_info


class Hangar(Institution):
    margin = FloatField(caption=u'Маржа с которой торгует NPC', root_default=0.2)
    limit_user_car = IntField(caption=u'Размер набора машин проданных пользователями')
    lot_timeout = IntField(caption=u"Время жизни лота")
    group_list = ListField(
        caption=u"Набор правил формирования ассортимента",
        field=EmbeddedDocumentField(document_type=CarGroup),
    )

    def __init__(self, *av, **kw):
        super(Hangar, self).__init__(*av, **kw)
        self._location = None
        self._group_lot_list = []
        self._user_lot_list = []

    def init(self, location, time):
        self._location = location
        for group in self.group_list:
            for i in range(group.count):
                self.add_car_lot(car_lot=CarLot(car_example=group.get_car(), group=group, hangar=self, time=time), time=time)

    def add_car_lot(self, car_lot, time):
        if car_lot.group:
            self._group_lot_list.append(car_lot)
        else:
            # Проверяем не достигнут ли лимит пользовательских лотов и если надо удаляем самый старый
            if self._user_lot_list and (len(self._user_lot_list) == self.limit_user_car):
                oldest_lot = self._user_lot_list[0]
                for lot in self._user_lot_list:
                    if lot.refresh_event.time < oldest_lot.refresh_event.time:
                        oldest_lot = lot
                self.del_car_lot(car_lot=oldest_lot, time=time)
            self._user_lot_list.append(car_lot)

        node_hash = self.node_hash()
        for visitor in self._location.visitors:
            HangarAddLotMessage(agent=visitor, time=time, npc_node_hash=node_hash, car_lot_info=car_lot.get_message_info(agent=visitor)).post()

    def del_car_lot(self, car_lot, time):
        if car_lot.refresh_event:
            car_lot.refresh_event.cancel()
        if car_lot.group:
            self._group_lot_list.remove(car_lot)
            self.add_car_lot(car_lot=CarLot(car_example=car_lot.group.get_car(), group=car_lot.group, hangar=self, time=time), time=time)
        else:
            self._user_lot_list.remove(car_lot)

        node_hash = self.node_hash()
        for visitor in self._location.visitors:
            HangarDelLotMessage(agent=visitor, time=time, npc_node_hash=node_hash, car_lot_info=car_lot.get_message_info(agent=visitor)).post()

    def get_all_lot_info(self, agent):
        return [lot.get_message_info(agent=agent) for lot in (self._group_lot_list + self._user_lot_list)]

    def get_car_lot_by_uid(self, car_uid):
        for car_lot in (self._group_lot_list + self._user_lot_list):
            if car_lot.car_example.uid == car_uid:
                return car_lot
        return None
