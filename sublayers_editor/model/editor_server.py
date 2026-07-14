# -*- coding: utf-8 -*-

import logging.config
log = logging.getLogger(__name__)

from pymongo import MongoClient
from bson.objectid import ObjectId
from sublayers_editor.model.tileid2 import Tileid2
from sublayers_editor.model.tileid import Tileid
from sublayers_editor.model.image_to_tileset import MongoDBToTilesets
import sublayers_editor.model.tileset as tileset

class EditorServer(object):

    def __init__(self, app, uid=None):
        self.app = app
        # подключение к базе

        self.db_connection = MongoClient()
        self.db = self.db_connection.maindb
        #self.tss = MongoDBToTilesets(self.db.tile_sets)


        self.tss = {
        #    'wood': tileset.Tileset(open('d:/ts_scrub_12')),
        #    'water': tileset.Tileset(open('d:/ts_water_12')),
           'road': tileset.Tileset(open('d:/tiles/ts_road_15', 'rb')),
        }


        log.info('EditorServer: Tilesets loaded !')
        print('EditorServer: Tilesets loaded !')

    def addObject(self, position, object_type):
        log.info('EditorServer: Add object')
        obj = {'tileid': Tileid2(int(position['x']), int(position['y']), int(position['z'])),
               'object_type': object_type}
        self.db.geo_objects.insert(obj)
        obj['position'] = position
        for client in self.app.clients:
            client.api.client.addObject(obj)

    def delObject(self, id):
        log.info('EditorServer: Del object')
        obj = self.db.geo_objects.find_one({'_id': ObjectId(id)})
        self.db.geo_objects.remove(obj)
        for client in self.app.clients:
            client.api.client.delObject(obj)

    def changeObject(self, position, id, **kw):
        log.info('EditorServer: Change object')
        obj = self.db.geo_objects.find_one({'_id': ObjectId(id)})
        obj['tileid'] = Tileid2(int(position['x']), int(position['y']), int(position['z']))
        self.db.geo_objects.save(obj)
        obj['position'] = position
        for client in self.app.clients:
            client.api.client.changeObject(obj)

    def selectAreaByRect(self, client, min_point, max_point, select_zoom):
        log.info('EditorServer: Select area by rect')
        min_tileid = Tileid2(int(min_point['x']), int(min_point['y']), int(min_point['z'])).parent_by_lvl(select_zoom)
        max_tileid = Tileid2(int(max_point['x']), int(max_point['y']), int(max_point['z'])).parent_by_lvl(select_zoom)
        tile_list = list(Tileid2.iter_rect(min_tileid, max_tileid))
        res = []
        for tile in tile_list:
            list_obj = self.db.geo_objects.find({'tileid':{'$gte':tile.index_child_first(), '$lte': tile.index_child_last()}})
            for e in list_obj:
                x, y, z = Tileid2(e['tileid']).xyz()
                e['position'] = {
                    'x': x,
                    'y': y,
                    'z': z
                }
                res.append(e)

        ts_res = []

        # todo переписать данное место. Здесь забирается информация из бд, тут сразу есть цвет
        current_zoom = int(min_point['z'])
        #if int(min_point['z']) > 13:
        for tile in tile_list:
            list_obj = self.db.tile_sets.find({'tileid':{'$gte': tile, '$lte': tile.index_child_last()}})
            for e in list_obj:
                x, y, z = Tileid2(e['tileid']).xyz()
                # если размер тайла имеет смысл показывать на данном масштабе
                if abs(current_zoom - z) < 6:
                    e['position'] = {
                        'x': x,
                        'y': y,
                        'z': z,
                    }
                    ts_res.append(e)

        # todo: переписываем получение списка листов тайлсетов из оперативной памяти

        client.setSelectArea(tile_list)
        client.selectAreaByRect(res)
        client.selectLeafsByRect(ts_res)

    def getRectsByArea(self, client, min_point, max_point, select_zoom):
        log.info('EditorServer: Send rect tiles')
        min_tileid = Tileid2(int(min_point['x']), int(min_point['y']), int(min_point['z'])).parent_by_lvl(select_zoom)
        max_tileid = Tileid2(int(max_point['x']), int(max_point['y']), int(max_point['z'])).parent_by_lvl(select_zoom)
        tile_list = Tileid2.iter_rect(min_tileid, max_tileid)
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


    def intersectTest(self, client, point, angle):
        log.info('EditorServer: Request Intersect With TS')
        res = []
        zoom = 26
        tid = Tileid(int(point['x']), int(point['y']), int(point['z']))
        b_tid = Tileid2(int(point['x']), int(point['y']), int(point['z'])).parent_by_lvl(17)
        for key in self.tss:
            p = self.tss[key].intersect_by_ray(tid, angle, border_tid = b_tid)
            x, y, z = p[0]
            x = x + p[1]
            y = y + p[2]
            x = x * (2**(zoom-z))
            y = y * (2**(zoom-z))
            res.append(dict(x=int(x), y=int(y), z=zoom, key=key))
        client.intersectTest(res)


if __name__ == "__main__":

    from random import randrange
    import time
    from sublayers_editor.model.tileset import Tileset

    #srv = EditorServer(app=None)


    print('Load Tilesets from files')
    start = time.time()

    tss = {
        'wood': Tileset(open('d:/ts_wood_11', 'rb')),
        'water': Tileset(open('d:/ts_water_11', 'rb')),
        'road': Tileset(open('d:/ts_road_12', 'rb')),
    }

    print("Loaded: ", time.time() - start, "seconds.")


    print('=========================')

    print('EditorServer: Tilesets loaded !')

    sx, sy, sz = Tileid2(1174, 652, 11).index_child_first(15).xyz()
    fx, fy, fz = Tileid2(1188, 665, 11).index_child_first(15).xyz()
    z = 26


    exper_list = []
    # формируем входныe данныe
    for i in range(10000):
        x = randrange(sx, fx)
        y = randrange(sy, fy)
        a = randrange(0, 6280) / 1000.
        exper_list.append((Tileid(x, y, z), a))


    print('Start experiment for ', len(exper_list), ' elements')
    start = time.time()

    for e in exper_list:
        for key in tss:
            tss[key].intersect_by_ray(e[0], e[1], 10000)


    print("it took", time.time() - start, "seconds.")
    print('End experiment')



    # Индексация по тайл айди, который может быть НЕ уникальным
    # >> use maindb
    # >> db.geo_objects.ensureIndex({ 'tileid' : 1})
    # a.db.geo_objects.ensureIndex({'tileid' : 1})
    # print(a.db.geo_objects.getIndexes())

    # Удаление элементов из коллекции
    #for e in a.db.geo_objects.find():
     #   print(e)
        #a.db.geo_objects.remove(e)
    print('=========================')


