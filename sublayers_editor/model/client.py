# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from bson.json_util import dumps
from tileid2 import Tileid2 as Tileid

class Client(object):
    def __init__(self, connection, srv):
        log.info('Agent before init')
        super(Client, self).__init__()
        self._connection = connection
        self.srv = srv
        self.objects = {}
        self.cur_rect = []

    @property
    def is_online(self):
        return self._connection is not None

    @property
    def connection(self):
        return self._connection

    @connection.setter
    def connection(self, new_connection):
        self._connection = new_connection

    def addObject(self, obj):
        log.info(u'Client: Добавление объекта в список объектов на клиенте')
        #self.objects.append(obj)
        self.objects[obj[u'_id']] = obj
        mes = dict(
            cls='addObject',
            obj=obj
        )
        self.connection.send(dumps(mes))

    def delObject(self, obj):
        log.info(u'Client: Удаление объекта из списка и отправка команды на клиент')
        if self.objects.has_key(obj[u'_id']):
            mes = dict(
                cls='delObject',
                obj=obj
            )
            del self.objects[obj[u'_id']]
            self.connection.send(dumps(mes))

    def changeObject(self, obj):
        log.info(u'Client: Изменение объекта из списка и отправка команды на клиент')
        if self.objects.has_key(obj[u'_id']):
            self.objects[obj[u'_id']] = obj
            mes = dict(
                cls='changeObject',
                obj=obj,
            )
            self.connection.send(dumps(mes))

    def sendRects(self, rects):
        log.info(u'Client: Отправка на клиента списка из прямоугольников')
        mes = dict(
            cls='sendRects',
            obj=rects,
        )
        self.connection.send(dumps(mes))

    def setSelectArea(self, rect):
        log.info(u'Client: Установка нового прямоугольника отсечения')
        # установка нового прямоугольника выбора
        self.cur_rect = rect

        # формирование список обектов которые надо удалить
        list_send = []

        for obj in self.objects:
            log.info(self.objects[obj])
            for tile in self.cur_rect:
                if Tileid(self.objects[obj][u'tileid']).in_tile(tile):
                    break
            else:
                list_send.append(self.objects[obj])


        log.info('_________________________________________________')
        # удаление объектов из self.objects
        for obj in list_send:
            log.info(obj)
            del self.objects[obj[u'_id']]

        # отправка на клиент
        mes = dict(
            cls='delObjects',
            obj=list_send,
        )
        self.connection.send(dumps(mes))

    def selectAreaByRect(self, objects):
        log.info(u'Client: Добавление объектов в область видимости')
        # запись новых объектов к себе в список
        list_send = []
        for obj in objects:
            log.info(obj)
            if not self.objects.has_key(obj[u'_id']):
                self.objects[obj[u'_id']] = obj
                list_send.append(obj)

        for obj in self.objects:
            log.info(self.objects[obj])

        # отправка на клиент
        mes = dict(
            cls='answerSelectAreaByRect',
            obj=list_send,
        )
        self.connection.send(dumps(mes))

