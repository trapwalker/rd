# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Root
from sublayers_server.model.tileset import Tileset
from sublayers_server.model.tileid import Tileid
from sublayers_server.model.messages import ZoneMessage
from sublayers_server.model.events import InsertNewServerZone
from sublayers_server.model import tags
from sublayers_server.model.tile_pixel_picker import TilePicker
from sublayers_server.model.registry.odm.fields import IntField, ListField, StringField, UniReferenceField

from tornado.options import options
from collections import Iterable
import os


class Zone(Root):
    effects = ListField(
        caption=u'Эффекты', doc=u'Список эффектов (URI), действующих в зоне',
        base_field=UniReferenceField(reference_document_type='sublayers_server.model.registry.classes.effects.Effect'),
    )
    order_key = StringField(caption=u'Порядковый ключ', doc=u'Алфавитный ключ, определяющий порядок загрузки зон')

    def __init__(self, **kw):
        super(Zone, self).__init__(**kw)
        self.is_active = False

    def activate(self, server, time):
        assert not self.abstract  # нельзя активировать абстрактные зоны
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
        # todo: Убрать сообщения о зонах, оставить только сообщения эффектов

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
    path = StringField(caption=u'Путь', doc=u'Файловый путь к файлу/каталогу с описанием зоны')  # todo: FilepathField
    max_map_zoom = IntField(default=18, caption=u'Максимальная тайловая глубина')  # todo: default?


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
    pixel_depth = IntField(caption=u'Глубина пикселя', doc=u'Тайловый уровень пикселя ресурсных изображений')
    extension = StringField(default='.jpg', caption=u'Расширение тайлов')
    channel = IntField(
        default=None, caption=u'Канал',
        doc=u'Номер цветовой компоненты со значением поля зоны (None -- брать цвет целиком)',
    )
    def __init__(self, **kw):
        super(RasterZone, self).__init__(**kw)
        self._picker = None

    def activate(self, server, time):
        assert self.pixel_depth  # Должна быть задана глубина пикселя
        self._picker = TilePicker(
            path=os.path.join(options.world_path, self.path),
            pixel_depth=self.pixel_depth,
            extension=self.extension,
        )
        super(RasterZone, self).activate(server, time)

    def get_value(self, obj, time):
        assert self._picker
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
