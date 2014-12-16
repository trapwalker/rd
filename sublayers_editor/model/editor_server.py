# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from pymongo import Connection
from bson.objectid import ObjectId
from tileid2 import Tileid2 as TileId

class EditorServer(object):

    def __init__(self, app, uid=None):
        self.app = app
        # подключение к базе
        self.db_connection = Connection()
        self.db = self.db_connection.maindb


    def addObject(self, position, object_type):
        log.info('EditorServer: Add object')
        obj = {u'tileid': TileId(long(position[u'x']), long(position[u'y']), long(position[u'z'])),
               u'object_type': object_type}
        self.db.geo_objects.insert(obj)
        obj[u'position'] = position
        for client in self.app.clients:
            client.api.client.addObject(obj)

    def delObject(self, id):
        log.info('EditorServer: Del object')
        obj = self.db.geo_objects.find_one({u'_id': ObjectId(id)})
        self.db.geo_objects.remove(obj)
        for client in self.app.clients:
            client.api.client.delObject(obj)

    def changeObject(self, position, id, **kw):
        log.info('EditorServer: Change object')
        obj = self.db.geo_objects.find_one({u'_id': ObjectId(id)})
        obj[u'tileid'] = TileId(long(position[u'x']), long(position[u'y']), long(position[u'z']))
        self.db.geo_objects.save(obj)
        obj[u'position'] = position
        for client in self.app.clients:
            client.api.client.changeObject(obj)

    def selectAreaByRect(self, client, min_point, max_point, select_zoom):
        log.info('EditorServer: Select area by rect')
        min_tileid = TileId(long(min_point[u'x']), long(min_point[u'y']), long(min_point[u'z'])).parent_by_lvl(select_zoom)
        max_tileid = TileId(long(max_point[u'x']), long(max_point[u'y']), long(max_point[u'z'])).parent_by_lvl(select_zoom)
        tile_list = list(TileId.iter_rect(min_tileid, max_tileid))
        res = []
        for tile in tile_list:
            list_obj = self.db.geo_objects.find({u'tileid':{'$gte':tile.index_child_first(), '$lte': tile.index_child_last()}})
            for e in list_obj:
                x, y, z = TileId(e['tileid']).xyz()
                e[u'position'] = {
                    'x': x,
                    'y': y,
                    'z': z
                }
                res.append(e)

        ts_res = []
        if long(min_point[u'z']) > 13:
            for tile in tile_list:
                list_obj = self.db.tile_sets.find({u'tileid':{'$gte':tile, '$lte': tile.index_child_last()}})
                for e in list_obj:
                    x, y, z = TileId(e['tileid']).xyz()
                    e[u'position'] = {
                        'x': x,
                        'y': y,
                        'z': z,
                    }
                    ts_res.append(e)

        client.setSelectArea(tile_list)
        client.selectAreaByRect(res)
        client.selectLeafsByRect(ts_res)

    def getRectsByArea(self, client, min_point, max_point, select_zoom):
        log.info('EditorServer: Send rect tiles')
        min_tileid = TileId(long(min_point[u'x']), long(min_point[u'y']), long(min_point[u'z'])).parent_by_lvl(select_zoom)
        max_tileid = TileId(long(max_point[u'x']), long(max_point[u'y']), long(max_point[u'z'])).parent_by_lvl(select_zoom)
        tile_list = TileId.iter_rect(min_tileid, max_tileid)
        res = []
        for tile in tile_list:
            x1, y1, z1 = tile.xyz()
            res.append({
                'point': {
                    'x': x1,
                    'y': y1,
                    'z': z1
                },
            })
        client.sendRects(res)


if __name__ == "__main__":
    import json
    from bson.json_util import dumps
    a = EditorServer(app=None)
    #a.db.geo_objects.insert({'type':'town','name':'test_town5', 'population': '4'})

    # Индексация по тайл айди, который может быть НЕ уникальным
    # >> use maindb
    # >> db.geo_objects.ensureIndex({ u'tileid' : 1})
    # a.db.geo_objects.ensureIndex({u'tileid' : 1})
    print a.db.geo_objects.getIndexes()

    for e in a.db.geo_objects.find():
        print e
        #x, y, z = TileId(e[u'tileid']).xyz()
        #print x, y, z
        #a.db.geo_objects.remove(e)
    print '========================='


