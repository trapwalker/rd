# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from vectors import Point as P

def rv(v):
    return abs(v) + 5


def calc(cp, direction, v, tp, rv_func=rv):
    """Calculate and return segmets of trajectory:
    @param cp: model.vectors.Point
    @param direction: float
    @param v: float
    @param tp: model.vectors.Point
    @param rv_func callable
    """
    pass


if __name__ == '__main__':
    pass
