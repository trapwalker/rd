# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import sys

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from tileid import Tileid

import os.path
from PIL import Image
from cachetools import lru_cache


DEFAULT_CACHE_SIZE = 100
ONE_TILE_DEPTH = 8


class TilePicker(object):
    def __init__(self, path, pixel_depth, extension='.jpg'):
        self.path = path
        self.pixel_depth = pixel_depth
        self.extension = extension

    @lru_cache(maxsize=DEFAULT_CACHE_SIZE)
    def _load_tile(self, tile):
        fn = self.tile_path(tile)
        log.debug('Try to load tile %s from %s', tile.xyz(), fn)
        try:
            img = Image.open(fn)
            return img.load()
        except IOError as e:
            log.warning('Tile %s not found', fn)
            # todo: other exceptions

    def tile_path(self, tile):
        return os.path.join(self.path, r'{2}/{1}/{0}{ext}'.format(*tile.xyz(), ext=self.extension))

    def get_pixel(self, x, y):
        tid = Tileid(x, y, self.pixel_depth)
        dx, dy, dz = (tid % ONE_TILE_DEPTH).xyz()
        tile = self._load_tile(tid.parent(ONE_TILE_DEPTH))
        if tile:
            return tile[dx, dy]

    def __getitem__(self, xy):
        return self.get_pixel(*xy)


if __name__ == '__main__':
    # D:\Home\svp\projects\sublayers\sublayers_server\temp\tiles_map_terrain_14_0-255\14\3012\6591.jpg
    p = r"D:\Home\svp\projects\sublayers\sublayers_server\temp\tiles_map_terrain_14_0-255"
    x, y, z = 6591, 93012, 14
    dx, dy = 90, 240
    tp = TilePicker(path=p, pixel_depth=14 + ONE_TILE_DEPTH)
    for i in xrange(100):
        print tp[x * 256 + dx, y * 256 + dy]
