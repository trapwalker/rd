# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from math import copysign, pi, degrees, cos, sqrt

from vectors import Point as P

def rv(v):
    return abs(v) + 5

def ppp(d):
    if d:
        maxk = max(map(len, d.keys()))
        for k, v in d.items():
            print '{:{}} = {}'.format(k, maxk, v)


def calc(cp, direction, v, tp, rv_func=rv):
    """Calculate and return segmets of trajectory:
    @param cp: model.vectors.Point
    @param direction: float
    @param v: float
    @param tp: model.vectors.Point
    @param rv_func callable
    """
    segments = []  # сегменты будущей траектории
    r = rv_func(v)  # вычисляем радиус разворота на заданной скорости
    t = tp - cp  # перемещаем систему координат в позицию машины
    d = P(1).rotate(direction)  # получаем вектор направления
    fi = t.angle - direction  # определяем угол доворота на целевую точку
    rc = d.rotate(copysign(pi / 2, fi)) * r  # вычисляем центр поворота
    ct = t - rc  # получаем вектор из точки поворота к цели
    if abs(ct) < r:  # если целевая точка внутри радиуса разворота
        ct = ct.rotate(-direction)  # поворачиваем систему координат в направлении машины
        l = sqrt(pow(r, 2) - pow(ct.x, 2)) + ct.y  # определяем сколько нужно проехать, чтобы выехать за пределы круга
        print 'Escape turn circle: t={t}, l={l}'.format(**locals())
        segments.append(dict(cls='Linear', l=l))  # добавляем прямолинейный сегмент удаления от цели
        t = t - d * l  # смещаем систему координат на расстояние, пройденное в сегменте
    
        

    ppp(locals())
    globals().update(locals())


    

if __name__ == '__main__':
    print calc(
        cp=P(10, 10),
        direction=0,
        v=0,
        tp=P(9.9, 10),
    )
