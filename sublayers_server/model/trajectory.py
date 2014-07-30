# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from math import copysign, pi, sqrt, acos, ceil, degrees

from vectors import Point

EPS = 1e-10


def rv_relation(v):
    return abs(v) + 5


def pfmt(x, indent=0, indent_filling='  '):
    if not x:
        return repr(x)
    elif isinstance(x, dict):
        maxk = max(map(len, x.keys()))
        return '{\n' + '\n'.join([
            '{}{:{}} = {}'.format((indent + 1) * indent_filling, k, maxk, pfmt(v, indent=indent + 1))
            for k, v in sorted(x.items())
        ]) + '\n' + indent * indent_filling + '}'
    elif isinstance(x, list):
        return '[\n' + '\n'.join([
            '{}{},'.format((indent + 1) * indent_filling, pfmt(v, indent=indent + 1))
            for v in x
        ]) + '\n' + indent * indent_filling + ']'
    else:
        return repr(x)


def circle_interpolate(r, c, alpha, beta, ccw, accuracy=16, **kw):
    fi = beta - alpha
    if not ccw:
        fi = 2 * pi - fi
    fi %= 2 * pi

    count = int(ceil(abs(fi * accuracy / (2 * pi))))  # вычисляем количество сегментов интерполяции
    psi = float(fi) / count  # вычисляем угол дуги сегмента интерполяции
    rv = (Point(1) * r)

    segments = []
    gamma = alpha
    a = rv.rotate(gamma) + c

    #fi_, psi_, alpha_, beta_ = map(degrees, (fi, psi, alpha, beta))
    #log.debug(pfmt(locals()))

    for i in xrange(count):
        gamma += psi
        b = rv.rotate(gamma) + c
        segments.append(dict(cls='Linear', a=a, b=b))
        a = b

    return segments


def build_trajectory(p, direction_angle, velocity, t, rv_func=rv_relation):
    """Calculate and return segmets of trajectory:
    @param p: model.vectors.Point
    @param direction_angle: float
    @param velocity: float
    @param t: model.vectors.Point
    @param rv_func callable
    """
    segments = []  # сегменты будущей траектории
    if p == t:
        return segments
    radius = rv_func(velocity)  # вычисляем радиус разворота на заданной скорости
    d = Point(1).rotate(direction_angle)  # получаем вектор направления
    turn_side_sign = copysign(1.0, d.cross_mul(t))  # получаем направление поворота: -1 по часовой, 1 - против
    pc = d.rotate(turn_side_sign * pi / 2) * radius  # получаем вектор pc (к центру разворота)
    c = p + pc  # координаты центра поворота
    ct = t - c  # вектор из центра поворота к цели
    ct_size = abs(ct)
    if ct_size < radius:  # если целевая точка внутри радиуса разворота
        _ = ct.rotate(-direction_angle)  # поворачиваем локальную временную систему координат в направлении машины
        l = (sqrt(pow(radius, 2) - pow(_.y, 2)) + _.x) * d  # вектор проезда до вывода целевой точки из радиуса поворота
        segments.append(dict(cls='Linear', a=p, b=p + l))  # добавляем прямолинейный сегмент удаления от цели
        p += l
        c += l
        ct = t - c
        ct_size = radius
        assert abs(ct_size - abs(ct)) < EPS, 'Turn circle escape failed: radius={radius}, /ct/={ct_size_new}'.format(
            ct_size_new=abs(ct),
            **locals()
        )
        log.info('Escape turn circle: accuracy=%(e)s, r=%(radius)s, /l/=%(l_size)s', dict(
            l_size=abs(l),
            e=ct_size - abs(ct),
            **locals())
        )

    # todo: test to direct way
    k = radius / ct_size
    x = c + k * ct.rotate(-turn_side_sign * acos(k))

    arc = dict(
        cls='Circular',
        r=radius,
        a=p,
        b=x,
        c=c,
        alpha=(-pc).angle,
        beta=(x - c).angle,
        ccw=1 if turn_side_sign > 0 else 0,
    )  # Формирование круговой сегмент траектории
    # segments.append(arc)  # todo: реализовать круговые сегменты траекторий
    segments += circle_interpolate(**arc)

    if abs(x - t) > EPS:
        segments.append(dict(cls='Linear', a=x, b=t))  # добавляем прямолинейный сегмент прибытия в целевую точку

    return segments


if __name__ == '__main__':
    print pfmt(build_trajectory(
        p=Point(10, 10),
        direction_angle=0,
        velocity=0,
        t=Point(9.99, 10),
    ))
