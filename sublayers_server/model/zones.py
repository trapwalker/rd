# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.tileset import Tileset
from sublayers_server.model.tileid import Tileid
from sublayers_server.model.messages import ZoneMessage
from sublayers_server.model.events import InsertNewServerZone
from sublayers_server.model.async_tools import async_deco
import sublayers_server.model.tags as tags
from sublayers_server.model.tile_pixel_picker import TilePicker

from tornado.options import options
import os


def init_zones_on_server(server, time):

    def read_ts_from_file(zone_name, file_name, server, effects, zone_cls=ZoneTileset):
        file_path = os.path.join(options.world_path, 'tilesets', file_name)
        zone = None
        if os.path.exists(file_path):
            if os.path.isfile(file_path):
                zone = zone_cls(
                    name=zone_name,
                    server=server,
                    effects=effects,
                    ts=Tileset(open(file_path)),
                )
        if zone:
            log.info('Successful read zone %s from file: %s', zone_name, file_name)
        else:
            log.warning('Failed read zone %s from file: %s', zone_name, file_name)
        return zone

    def on_result(result):
        # создание эвента для добавления зоны в сервер
        if result is not None:
            InsertNewServerZone(server=server, time=time, zone=result).post()

    def on_error(error):
        """async call error handler"""
        log.warning('Read Zone: on_error(%s)', error)

    def load_all_ts():
        InsertNewServerZone(
            server=server,
            time=time,
            zone=read_ts_from_file(
                zone_name='Road',
                file_name='ts_road',
                server=server,
                effects=[
                    server.effects.get('EffectRoadRCCWood'),
                    server.effects.get('EffectRoadRCCWater'),
                    server.effects.get('EffectRoadRCCDirt'),
                    server.effects.get('EffectRoadRCCSlope'),
                ],
            ),
        ).post()

        InsertNewServerZone(
            server=server,
            time=time,
            zone=read_ts_from_file(
                zone_name='Wood',
                file_name='ts_wood',
                server=server,
                effects=[
                    server.effects.get('EffectWoodCC'),
                    server.effects.get('EffectWoodVisibility'),
                    server.effects.get('EffectWoodObsRange'),
                ],
            ),
        ).post()

        InsertNewServerZone(
            server=server,
            time=time,
            zone=read_ts_from_file(
                server=server,
                zone_name='Water',
                file_name='ts_water',
                effects=[server.effects.get('EffectWaterCC')],
            ),
        ).post()

        InsertNewServerZone(
            server=server,
            time=time,
            zone=read_ts_from_file(
                server=server,
                zone_name='Slope',
                file_name='ts_slope_black_80',
                effects=[server.effects.get('EffectSlopeCC')],
            ),
        ).post()

    # загрузка особенной зоны - бездорожье
    server.zones.append(ZoneDirt(name='Dirt', server=server, effects=[server.effects.get('EffectDirtCC')]))

    async_deco(load_all_ts, result_callback=on_result, error_callback=on_error)()

    InsertNewServerZone(
        server=server,
        time=time,
        zone=AltitudeZonePicker(
            name='Altitude',
            server=server,
            effects=[],
            tiles_path=os.path.join(options.world_path, 'altitude'),
            pixel_depth=14 + 8,
        )
    ).post()


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


class AltitudeZonePicker(Zone):
    def __init__(self, tiles_path, pixel_depth, extension='.jpg', **kw):
        super(AltitudeZonePicker, self).__init__(**kw)
        self._picker = TilePicker(path=tiles_path, pixel_depth=pixel_depth, extension=extension)
        self.max_map_zoom = 18  # todo: вынести в конфигурацию

    def test_in_zone(self, obj, time):
        if tags.UnZoneTag in obj.tags or tags.UnAltitudeTag in obj.tags:
            return

        position = obj.position(time=time)
        x, y, z = Tileid(
            long(position.x),
            long(position.y),
            self.max_map_zoom + 8
        ).parent(self.max_map_zoom + 8 - self._picker.pixel_depth).xyz()

        alt = self._picker[x, y]

        if alt is not None:
            obj.on_change_altitude(alt[0], time=time)
