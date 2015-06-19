# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.image_to_tileset import MongoDBToTilesets
from sublayers_server.model.tileset import Tileset
from sublayers_server.model.tileid import Tileid
from sublayers_server.model.messages import ZoneMessage
import sublayers_server.model.tags as tags


import os


def init_zones_on_server(server):
    def read_ts_from_file(zone_name, file_name, server, effects, zone_cls=ZoneTileset):
        zone = None
        if os.path.exists(file_name):
            if os.path.isfile(file_name):
                zone = zone_cls(
                    name=zone_name,
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

    read_ts_from_file(zone_name='Wood', file_name='tilesets/ts_wood', server=server, effects=[
        server.effects.get('EffectWoodCC'),
        server.effects.get('EffectWoodVisibility'),
        server.effects.get('EffectWoodObsRange'),
    ])
    read_ts_from_file(zone_name='Water', file_name='tilesets/ts_water', server=server, effects=[server.effects.get('EffectWaterCC')])

    '''
    read_ts_from_file(zone_name='Road', file_name='tilesets/ts_road', server=server, effects=[
        server.effects.get('EffectRoadRCCWood'),
        server.effects.get('EffectRoadRCCWater'),
        server.effects.get('EffectRoadRCCDirt'),
        ])
    '''
    #read_ts_from_file(zone_name='Altitude', file_name='tilesets/ts_altitude_15', server=server, effects=[], zone_cls=AltitudeZoneTileset)

    server.zones.append(ZoneDirt(name='Dirt', server=server, effects=[server.effects.get('EffectDirtCC')]))

    log.info("Zones ready!")


class Zone(object):
    def __init__(self, server, name, effects):
        super(Zone, self).__init__()
        self.server = server
        self.name = name
        self.effects = effects[:]

    def send_message(self, obj, active, time):
        if obj.owner:
            ZoneMessage(agent=obj.owner, subj=obj, name=self.name, is_start=active, time=time).post()

    def _obj_in_zone(self, obj, time):
        obj.zones.append(self)
        for effect in self.effects:
            effect.start(owner=obj, time=time)
        self.send_message(obj=obj, active=True, time=time)

    def _obj_out_zone(self, obj, time):
        obj.zones.remove(self)
        for effect in self.effects:
            effect.done(owner=obj, time=time)
        self.send_message(obj=obj, active=False, time=time)

    def test_in_zone(self, obj, time):
        pass


class ZoneDirt(Zone):
    def test_in_zone(self, obj, time):
        if tags.UnZoneTag in obj.tags:
            return
        if self not in obj.zones:
            self._obj_in_zone(obj=obj, time=time)


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
            if self not in obj.zones:
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
        obj.on_change_altitude(
            new_altitude=self.ts.get_tile(Tileid(long(position.x), long(position.y), self.max_map_zoom + 8)), time=time)