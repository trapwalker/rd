# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from bson.json_util import dumps

class Client(object):
    def __init__(self, connection, srv):
        log.info('Agent before init')
        super(Client, self).__init__()
        self._connection = connection
        self.srv = srv
        self.objects = {}

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
                obj=obj
            )
            self.connection.send(dumps(mes))
