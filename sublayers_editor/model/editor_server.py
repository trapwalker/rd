# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from pymongo import Connection
from bson.objectid import ObjectId

class EditorServer(object):

    def __init__(self, app, uid=None):
        self.app = app
        # подключение к базе
        self.db_connection = Connection()
        self.db = self.db_connection.maindb


    def addObject(self, coord, object_type):
        log.info(u'EditorServer: Добавление объекта')
        obj = {'coord': coord, 'object_type': object_type}
        self.db.geo_objects.insert(obj)
        for client in self.app.clients:
            client.api.client.addObject(obj)


    def delObject(self, id):
        log.info(u'EditorServer: Удаление объекта')
        obj = self.db.geo_objects.find_one({u'_id': ObjectId(id)})
        self.db.geo_objects.remove(obj)
        for client in self.app.clients:
            client.api.client.delObject(obj)


    def changeObject(self, coord, id, **kw):
        log.info(u'EditorServer: Изменение объекта')
        obj = self.db.geo_objects.find_one({u'_id': ObjectId(id)})
        obj['coord'] = coord
        self.db.geo_objects.save(obj)
        for client in self.app.clients:
            client.api.client.changeObject(obj)





if __name__ == "__main__":
    import json
    from bson.json_util import dumps
    a = EditorServer(app=None)
    #a.db.geo_objects.insert({'type':'town','name':'test_town5', 'population': '4'})

    for e in a.db.geo_objects.find():
        print e
        #print e[u'_id']
        #print dumps(e)
        #if e[u'object_type'] == u'town':
        #a.db.geo_objects.remove(e)
    print '========================='


    e = a.db.geo_objects.find_one({u'_id': ObjectId(u'54848f060463e51bfc04e500')})
    print e
