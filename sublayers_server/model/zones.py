# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.image_to_tileset import MongoDBToTilesets
from sublayers_server.model.tileset import Tileset
from sublayers_server.model.tileid import Tileid
import sublayers_server.model.tags as tags

import os


def init_zones_on_server(server):
    def read_ts_from_file(file_name, server, effects, zone_cls=ZoneTileset):
        zone = None
        if os.path.exists(file_name):
            if os.path.isfile(file_name):
                zone = zone_cls(
                    server=server,
                    effects=effects,
                    ts=Tileset(open(file_name)),
                )
        if zone:
            server.zones.append(zone)
            log.info('Successful read zone from file: %s', file_name)
        else:
            log.info('Failed read zone from file: %s', file_name)

    # todo: считывать формат загрузки из конфигурационного файла
    """
    # Считывание из Mongo
    log.info("Read zones tileset from Mongo.")
    from pymongo import Connection
    self.db_connection = Connection()
    self.db_collections = self.db_connection.maindb
    self.tss = MongoDBToTilesets(self.db_collections.tile_sets)
    """
    # Считывание из файлов
    log.info("Read zones tileset from files.")

    read_ts_from_file(file_name='tilesets/ts_wood', server=server, effects=[
        server.effects.get('EffectWoodCC'),
        server.effects.get('EffectWoodVisibility'),
        server.effects.get('EffectWoodObsRange'),
    ])
    read_ts_from_file(file_name='tilesets/ts_water', server=server, effects=[server.effects.get('EffectWaterCC')])
    read_ts_from_file(file_name='tilesets/ts_road', server=server, effects=[
        server.effects.get('EffectRoadRCCWood'),
        server.effects.get('EffectRoadRCCWater'),
        server.effects.get('EffectRoadRCCDirt'),
        ])
    #read_ts_from_file(file_name='tilesets/ts_altitude_15', server=server, effects=[], zone_cls=AltitudeZoneTileset)

    log.info("Zones ready!")


class Zone(object):
    def __init__(self, server, effects):
        super(Zone, self).__init__()
        self.server = server
        self.effects = effects[:]

    def _obj_in_zone(self, obj, time):
        obj.zones.append(self)
        for effect in self.effects:
            effect.start(owner=obj, time=time)

    def _obj_out_zone(self, obj, time):
        obj.zones.remove(self)
        for effect in self.effects:
            effect.done(owner=obj, time=time)

    def test_in_zone(self, obj, time):
        pass


class ZoneTileset(Zone):
    def __init__(self, ts, **kw):
        super(ZoneTileset, self).__init__(**kw)
        self.ts = ts
        # todo: вынести в сервер или куда-то !!!!
        self.max_map_zoom = 18

    def test_in_zone(self, obj, time):
        if tags.UnZoneTag in obj.tags:
            return
        position = obj.position(time=time)
        if self.ts.get_tile(Tileid(long(position.x), long(position.y), self.max_map_zoom + 8)):
            if not self in obj.zones:
                self._obj_in_zone(obj=obj, time=time)
        else:
            if self in obj.zones:
                self._obj_out_zone(obj=obj, time=time)


class AltitudeZoneTileset(ZoneTileset):
    def test_in_zone(self, obj, time):
        if tags.UnZoneTag in obj.tags:
            return
        if tags.UnAltitudeTag in obj.tags:
            return
        position = obj.position(time=time)
        obj.on_change_altitude(new_altitude=self.ts.get_tile(Tileid(long(position.x), long(position.y), self.max_map_zoom + 8)))