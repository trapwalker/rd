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
        log.info('Client: Add object to client')
        for tile in self.cur_rect:
            if Tileid(obj[u'tileid']).in_tile(tile):
                self.objects[obj[u'_id']] = obj
                mes = dict(
                    cls='addObject',
                    obj=obj
                )
                self.connection.send(dumps(mes))

    def delObject(self, obj):
        log.info('Client: Del object from client')
        if self.objects.has_key(obj[u'_id']):
            mes = dict(
                cls='delObject',
                obj=obj
            )
            del self.objects[obj[u'_id']]
            self.connection.send(dumps(mes))

    def changeObject(self, obj):
        log.info('Client: Change object')
        if self.objects.has_key(obj[u'_id']):
            self.objects[obj[u'_id']] = obj
            mes = dict(
                cls='changeObject',
                obj=obj,
            )
            self.connection.send(dumps(mes))
        else:
            for tile in self.cur_rect:
                if Tileid(obj[u'tileid']).in_tile(tile):
                    self.addObject(obj)

    def sendRects(self, rects):
        log.info('Client: Send rect tiles')
        mes = dict(
            cls='sendRects',
            obj=rects,
        )
        self.connection.send(dumps(mes))

    def setSelectArea(self, rect):
        log.info('Client: Set select area rectangle and delete hidden objects')
        # установка нового прямоугольника выбора
        self.cur_rect = rect

        # формирование список обектов которые надо удалить
        list_send = []
        for obj in self.objects:
            for tile in self.cur_rect:
                if Tileid(self.objects[obj][u'tileid']).in_tile(tile):
                    break
            else: list_send.append(self.objects[obj])

        # удаление объектов из self.objects
        for obj in list_send:
            del self.objects[obj[u'_id']]

        # отправка на клиент
        mes = dict(
            cls='delObjects',
            obj=list_send,
        )
        self.connection.send(dumps(mes))

    def selectAreaByRect(self, objects):
        log.info('Client: Add new objects by select area')

        # запись новых объектов к себе в список
        list_send = []
        for obj in objects:
            if not self.objects.has_key(obj[u'_id']):
                self.objects[obj[u'_id']] = obj
                list_send.append(obj)

        # отправка на клиент
        mes = dict(
            cls='answerSelectAreaByRect',
            obj=list_send,
        )
        self.connection.send(dumps(mes))