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
        self.ts_leafs = {}
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
        if len(list_send) > 0:
            mes = dict(
                cls='delObjects',
                obj=list_send,
            )
            self.connection.send(dumps(mes))

        # формирование список тайлов которые надо удалить
        list_send_leaf = []
        for obj in self.ts_leafs:
            for tile in self.cur_rect:
                if Tileid(self.ts_leafs[obj][u'tileid']).in_tile(tile):
                    break
            else: list_send_leaf.append(self.ts_leafs[obj])

        # удаление листьев из self.ts_leafs
        for obj in list_send_leaf:
            del self.ts_leafs[obj[u'_id']]

        # отправка на клиент
        if len(list_send_leaf) > 0:
            ts_mes = dict(
                cls='delTiles',
                obj=list_send_leaf,
            )
            self.connection.send(dumps(ts_mes))

    def selectAreaByRect(self, objects):
        log.info('Client: Add new objects by select area')

        # запись новых объектов к себе в список
        list_send = []
        for obj in objects:
            if not self.objects.has_key(obj[u'_id']):
                self.objects[obj[u'_id']] = obj
                list_send.append(obj)

        # отправка на клиент
        if len(list_send) > 0:
            mes = dict(
                cls='answerSelectAreaByRect',
                obj=list_send,
            )
            self.connection.send(dumps(mes))

    def sendTestRoads(self):
        log.info('Client: Send roads to client')
        roads = []
        for e in self.srv.db.sroads.find({}, {u'_id':0}).limit(1000):
            roads.append(e)

        mes = dict(
            cls='roads',
            obj=roads,
        )
        self.connection.send(dumps(mes))

    def selectLeafsByRect(self, objects):
        log.info('Client: Add new leafs by select area')

        # запись новых объектов к себе в список
        list_send = []
        for obj in objects:
            if not self.ts_leafs.has_key(obj[u'_id']):
                self.ts_leafs[obj[u'_id']] = obj
                list_send.append(obj)

        # отправка на клиент
        if len(list_send) > 0:
            mes = dict(
                cls='addTiles',
                obj=list_send,
            )
            self.connection.send(dumps(mes))

    def intersectTest(self, res):
        log.info('Client: Send result points of intersect')
        mes = dict(
            cls='intersectResult',
            obj=res,
        )
        self.connection.send(dumps(mes))

