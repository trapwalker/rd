# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import sys

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from tileid import Tileid
from async_tools import async_deco

import os
from PIL import Image
from cachetools import LRUCache


DEFAULT_CACHE_SIZE = 100
ONE_TILE_DEPTH = 8


class TilePicker(object):
    def __init__(self, path, pixel_depth, extension='.jpg'):
        self.path = path
        self.pixel_depth = pixel_depth
        self.extension = extension
        self._cache = LRUCache(maxsize=DEFAULT_CACHE_SIZE)
        self._download_list = set()

    def _async_load(self, tid):
        self._download_list.add(tid)
        async_deco(self.get_tile, result_callback=self._tile_load_done)(tid)  # todo: catch exceptions

    def _tile_load_done(self, (tid, value)):
        self._cache[tid] = value
        self._download_list.remove(tid)

    #@lru_cache(maxsize=DEFAULT_CACHE_SIZE)
    def get_tile(self, tid):
        fn = self.tile_path(tid)
        # log.debug('Try to load tile %s from %s (%s)', tid.xyz(), fn, os.getcwd())
        try:
            img = Image.open(fn)
            return tid, img.load()
        except IOError as e:
            log.warning('Tile %r not found: %r', os.path.abspath(fn), e.message)
            # todo: other exceptions

        return tid, None

    def tile_path(self, tid):
        return os.path.join(self.path, r'{2}/{0}/{1}{ext}'.format(*tid.xyz(), ext=self.extension))

    def get_pixel(self, x, y):
        tid = Tileid(x, y, self.pixel_depth)
        dx, dy, dz = (tid % ONE_TILE_DEPTH).xyz()
        tid = tid.parent(ONE_TILE_DEPTH)
        tile = self._cache.get(tid, False)
        if tile is False:
            if tid not in self._download_list:
                self._async_load(tid)
        elif tile is not None:
            return tile[dx, dy]

    def __getitem__(self, xy):
        return self.get_pixel(*xy)


if __name__ == '__main__':
    from vectors import Point
    pth = r"..\temp\tiles_map_terrain_14_0-255"
    x, y, z = 3012, 6591, 14  # center of test area
    tp = TilePicker(path=pth, pixel_depth=14 + ONE_TILE_DEPTH)
    for i in xrange(2000):
        p = Point.random_gauss(Point(x * 256 + 127, y * 256 + 127), 500)
        xy = int(p.x), int(p.y)
        print xy, tp[xy]

    #print tp._cache.cache_info()
