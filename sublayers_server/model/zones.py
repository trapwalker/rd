# -*- coding: utf-8 -*-

import logging
from pymongo import Connection
from image_to_tileset import MongoDBToTilesets
from tileset import Tileset
from tileid import Tileid
from effects_zone import EffectRoad, EffectWater, EffectWood

log = logging.getLogger(__name__)

def init_zones_on_server(server):
    # todo: считывать формат загрузки из конфигурационного файла
    """
    # Считывание из Mongo
    log.info("Read zones tileset from Mongo.")
    self.db_connection = Connection()
    self.db_collections = self.db_connection.maindb
    self.tss = MongoDBToTilesets(self.db_collections.tile_sets)
    """
    # Считывание из файлов
    log.info("Read zones tileset from files.")
    server.zones.append(ZoneTileset(
        server=server,
        effects=[EffectWood],
        ts=Tileset(open('d:/ts_wood')),
    ))
    server.zones.append(ZoneTileset(
        server=server,
        effects=[EffectWater],
        ts=Tileset(open('d:/ts_water')),
    ))
    server.zones.append(ZoneTileset(
        server=server,
        effects=[EffectRoad],
        ts=Tileset(open('d:/ts_road')),
    ))
    log.info("Zones ready!")


class Zone(object):
    def __init__(self, server, effects):
        super(Zone, self).__init__()
        self.server = server
        self.effects = effects[:]

    def _obj_in_zone(self, obj):
        obj.zones.append(self)
        for effect in self.effects:
            effect(owner=obj).start()

    def _obj_out_zone(self, obj):
        obj.zones.remove(self)

        for effect in obj.effects:
            if effect.__class__ in self.effects:
                effect.done()

    def test_in_zone(self, obj):
        pass


class ZoneTileset(Zone):
    def __init__(self, ts, **kw):
        super(ZoneTileset, self).__init__(**kw)
        self.ts = ts
        # todo: вынести в сервер или куда-то !!!!
        self.max_map_zoom = 18

    def test_in_zone(self, obj):
        position = obj.position
        if self.ts.get_tile(Tileid(long(position.x), long(position.y), self.max_map_zoom + 8)):
            if not self in obj.zones:
                self._obj_in_zone(obj=obj)
        else:
            if self in obj.zones:
                self._obj_out_zone(obj=obj)
