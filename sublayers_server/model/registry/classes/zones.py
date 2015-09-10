# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.storage import Root
from sublayers_server.model.registry.attr import Attribute, IntAttribute, TextAttribute

from sublayers_server.model.tileset import Tileset
from sublayers_server.model.tileid import Tileid
from sublayers_server.model.messages import ZoneMessage
from sublayers_server.model.events import InsertNewServerZone
from sublayers_server.model.async_tools import async_deco
from sublayers_server.model import tags
from sublayers_server.model.tile_pixel_picker import TilePicker

from tornado.options import options
from collections import Iterable
import os


class Zone(Root):

    effect_names = Attribute(caption=u'Эффекты', doc=u'Список эффектов, действующих в зоне')  # todo: list attribute
    order_key = TextAttribute(caption=u'Порядковый ключ', doc=u'Алфавитный ключ, определяющий порядок загрузки зон')

    def __init__(self, **kw):
        super(Zone, self).__init__(**kw)
        self.effects = []
        self.is_active = False

    def activate(self, server, time):
        assert not self.abstract  # нельзя активировать абстрактные зоны
        for effect_name in self.effect_names or ():
            self.effects.append(server.effects.get(effect_name))
        InsertNewServerZone(server=server, time=time, zone=self).post()
        self.is_active = True

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

    def get_value(self, obj, time):
        return

    def test_in_zone(self, obj, time):
        if tags.UnZoneTag in obj.tags:
            return
        value = self.get_value(obj, time)
        if value is None:
            return

        if value:
            if self not in obj.zones:
                self._obj_in_zone(obj=obj, time=time)
        else:
            if self in obj.zones:
                self._obj_out_zone(obj=obj, time=time)


class ZoneDirt(Zone):
    def test_in_zone(self, obj, time):
        if tags.UnZoneTag in obj.tags:
            return
        if self not in obj.zones:
            self._obj_in_zone(obj=obj, time=time)


class FileZone(Zone):
    path = TextAttribute(caption=u'Путь', doc=u'Файловый путь к файлу/каталогу с описанием зоны')
    max_map_zoom = IntAttribute(default=18, caption=u'Максимальная тайловая глубина')  # todo: default?


class TilesetZone(FileZone):

    def __init__(self, **kw):
        super(TilesetZone, self).__init__(**kw)
        self.ts = None

    def activate(self, server, time):
        if self._load_from_file():
            super(TilesetZone, self).activate(server, time)

    def _load_from_file(self):
        file_path = os.path.join(options.world_path, self.path)
        try:
            with open(file_path) as f:
                self.ts = Tileset(f)
        except Exception as e:
            log.warning("Can not load zone %s from %r: %s", self.name, file_path, e)
            return
        else:
            log.info('Successful read zone %s from file: %s', self.name, file_path)
            return True

    def get_value(self, obj, time):
        position = obj.position(time=time)
        return self.ts.get_tile(Tileid(long(position.x), long(position.y), self.max_map_zoom + 8))


class RasterZone(FileZone):
    pixel_depth = IntAttribute(caption=u'Глубина пикселя', doc=u'Тайловый уровень пикселя ресурсных изображений')
    extension = TextAttribute(default='.jpg', caption=u'Расширение тайлов')
    channel = IntAttribute(default=None, caption=u'Канал',
                           doc=u'Номер цветовой компоненты со значением поля зоны (None -- брать цвет целиком)')

    def __init__(self, **kw):
        super(RasterZone, self).__init__(**kw)
        self._picker = TilePicker(
            path=os.path.join(options.world_path, self.path),
            pixel_depth=self.pixel_depth,
            extension=self.extension,
        )

    def activate(self, server, time):
        assert self.pixel_depth  # Должна быть задана глубина пикселя
        super(RasterZone, self).activate(server, time)

    def get_value(self, obj, time):
        position = obj.position(time=time)
        mz = self.max_map_zoom + 8  # todo: speed optimization (attribute getter)
        x, y, z = Tileid(long(position.x), long(position.y), mz).parent(mz - self._picker.pixel_depth).xyz()
        value = self._picker[x, y]
        if value is None:
            return

        channel = self.channel
        if channel is None:
            return value
        if isinstance(value, Iterable):
            return value[channel]
        else:
            assert channel == 0
            return value


class AltitudeZone(RasterZone):
    def test_in_zone(self, obj, time):
        if tags.UnZoneTag in obj.tags:
            return
        if tags.UnAltitudeTag in obj.tags:
            return

        value = self.get_value(obj, time)
        if value is not None:
            obj.on_change_altitude(new_altitude=value, time=time)


def init_zones_on_server(server, time):

    def on_error(error):
        """async call error handler"""
        log.warning('Read Zone: on_error(%s)', error)

    def load_all_ts():
        zones = [zone for zone in server.reg['/zones']]
        zones.sort(key=lambda zone: zone.order_key)
        for zone in zones:
            if not zone.is_active:
                log.info('Try to activate zone %s', zone)
                zone.activate(server=server, time=time)
                if zone.is_active:
                    log.info('Zone %s activated successfully', zone)
                else:
                    log.warning('Zone %s is not activated')

    async_deco(load_all_ts, error_callback=on_error)()
