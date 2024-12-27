# -*- coding: utf-8 -*-

import sys

if __name__ == '__main__':
    sys.path.append('..')

from sublayers_server.model.vectors import Point

import math
from collections import namedtuple


LngLat = namedtuple('LngLat', ['lng', 'lat'])


class Mercator(object):
    @staticmethod
    def project(ll, zoom):
        DEG_TO_RAD = math.pi / 180
        MAX_LATITUDE = 85.0511287798
        scale = math.pow(2, zoom + 8)

        x = ll.lng * DEG_TO_RAD
        y = max(min(MAX_LATITUDE, ll.lat), -MAX_LATITUDE) * DEG_TO_RAD
        y = math.log(math.tan((math.pi / 4) + (y / 2)))

        return Point(
            x=scale * ((0.5 / math.pi) * x + 0.5),
            y=scale * ((-0.5 / math.pi) * y + 0.5)
        )

    @staticmethod
    def unproject(point, zoom):
        scale = math.pow(2, zoom + 8)
        RAD_TO_DEG = 180 / math.pi
        x =  (point.x / scale - 0.5) / (0.5 / math.pi)
        y = -(point.y / scale - 0.5) / (0.5 / math.pi)
        return LngLat(
            lat=(2 * math.atan(math.exp(y)) - (math.pi / 2)) * RAD_TO_DEG,
            lng=x * RAD_TO_DEG
        )

if __name__ == '__main__':
    import mercantile

    def test_xy(xy1, z=18+8):
        ll2 = Mercator.unproject(xy1, 18)
        xy2 = Mercator.project(ll2, 18)        
        print('our: {xy1} -> {ll2:50s} -> {xy2:.0f} '.format(**locals()))
        ll2 = mercantile.ul(*xy1.as_tuple() + (z,))
        xy2 = mercantile.tile(*ll2 + (z,))[:2]
        print('oth: {xy1} -> {ll2:50s} -> {xy2} '.format(**locals()))

    p = Point(x=40371667, y=22592826)
    test_xy(p)
