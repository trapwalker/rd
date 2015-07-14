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
    def get_tile(self, tid):
        fn = self.tile_path(tid)
        log.debug('Try to load tile %s from %s', tid.xyz(), fn)
        try:
            img = Image.open(fn)
            return img.load()
        except IOError as e:
            log.warning('Tile %s not found', fn)
            # todo: other exceptions

    def tile_path(self, tid):
        return os.path.join(self.path, r'{2}/{1}/{0}{ext}'.format(*tid.xyz(), ext=self.extension))

    def get_pixel(self, x, y):
        tid = Tileid(x, y, self.pixel_depth)
        dx, dy, dz = (tid % ONE_TILE_DEPTH).xyz()
        tile = self.get_tile(tid.parent(ONE_TILE_DEPTH))
        if tile:
            return tile[dx, dy]

    def __getitem__(self, xy):
        return self.get_pixel(*xy)


if __name__ == '__main__':
    from vectors import Point
    pth = r"..\temp\tiles_map_terrain_14_0-255"
    x, y, z = 6591, 3012, 14  # center of test area
    tp = TilePicker(path=pth, pixel_depth=14 + ONE_TILE_DEPTH)
    for i in xrange(2000):
        p = Point.random_gauss(Point(x * 256 + 127, y * 256 + 127), 500)
        xy = int(p.x), int(p.y)
        print xy, tp[xy]

    print tp.get_tile.cache_info()
