# -*- coding: utf-8 -*-

import logging
from pymongo import Connection
from image_to_tileset import MongoDBToTilesets
from tileset import Tileset
from tileid import Tileid


log = logging.getLogger(__name__)


class TilesetZones(object):
    def __init__(self, server):
        super(TilesetZones, self).__init__()
        self.server = server
        self.tss = None

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
        self.tss = {
            u'wood': Tileset(open('d:/ts_wood')),
            u'water': Tileset(open('d:/ts_water')),
            u'road': Tileset(open('d:/ts_road')),
        }
        log.info("Zones ready!")
        # todo: вынести в сервер или куда-то !!!!
        self.max_map_zoom = 18

    @property
    def classname(self):
        return self.__class__.__name__

    def as_dict(self):
        return dict(
            cls=self.classname,
        )

    def test_position(self, position):
        u"""
        :return dict вида имя зоны - флаг вхождения
        """
        d = {}
        for key in self.tss.keys():
            if self.tss[key].get_tile(Tileid(long(position.x), long(position.y), self.max_map_zoom + 8)):
                d[key] = True
            else:
                d[key] = False
        return d

    def test_zones(self, obj):
        d = self.test_position(position=obj.position)
        for key in d.keys():
            if d[key]:
                obj.in_zone(key)
            else:
                obj.out_zone(key)