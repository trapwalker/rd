# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from math import copysign, pi, sqrt, acos, ceil

from vectors import Point

EPS = 1e-6


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


def circle_interpolate(r, c, alpha, beta, ccw, tags=(), accuracy=16, **_):
    tags = tags + ('interpolate',)
    fi = beta - alpha
    if not ccw:
        fi = 2 * pi - fi
    fi %= 2 * pi
    fi = abs(fi)

    count = int(ceil(abs(fi * accuracy / (2 * pi))))  # вычисляем количество сегментов интерполяции
    psi = float(fi) / count * (1 if ccw else -1)  # вычисляем угол дуги сегмента интерполяции
    rv = (Point(1) * r)

    segments = []
    gamma = alpha
    a = rv.rotate(gamma) + c

    #fi_, psi_, alpha_, beta_ = map(degrees, (fi, psi, alpha, beta))
    #log.debug(pfmt(locals()))

    for i in xrange(count):
        gamma += psi
        b = rv.rotate(gamma) + c
        segments.append(dict(cls='Linear', a=a, b=b, tags=tags))
        a = b

    return segments


def build_trajectory(p, direction_angle, velocity, t, rv_func=rv_relation):
    """Calculate and return segmets of trajectory:
    @param p: sublayers_server.model.vectors.Point
    @param direction_angle: float
    @param velocity: float
    @param t: sublayers_server.model.vectors.Point
    @param rv_func callable
    """
    segments = []  # сегменты будущей траектории
    if p == t:
        return segments
    d = Point(1).rotate(direction_angle)  # получаем вектор направления

    if not ((t - p).normalize() - d).is_zero(EPS):
        radius = rv_func(velocity)  # вычисляем радиус разворота на заданной скорости
        turn_side_sign = copysign(1.0, d.cross_mul(t - p))  # получаем направление поворота: -1 по часовой, 1 - против
        pc = d.rotate(turn_side_sign * pi / 2) * radius  # получаем вектор pc (к центру разворота)
        # todo: optimize rotation 90
        c = p + pc  # координаты центра поворота
        ct = t - c  # вектор из центра поворота к цели
        ct_size = abs(ct)
        if ct_size < radius:  # если целевая точка внутри радиуса разворота
            _ = ct.rotate(-direction_angle)  # поворачиваем локальную временную систему координат в направлении машины
            l = (sqrt(pow(radius, 2) - pow(_.y, 2)) + _.x) * d  # вектор предварительного проезда прямо
            segments.append(dict(cls='Linear', a=p, b=p + l, tags=('radius_escape',)))
            p += l
            c += l
            ct = t - c
            ct_size = radius
            assert abs(ct_size - abs(ct)) < EPS, 'Turn circle escape failed: r={radius}, /ct/={ct_size_new}'.format(
                ct_size_new=abs(ct),
                **locals()
            )
            log.error('Escape turn circle: accuracy=%(e)s, r=%(radius)s, /l/=%(l_size)s', dict(
                l_size=abs(l),
                e=ct_size - abs(ct),
                **locals())
            )

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
            tags=('turn',),
        )  # Формирование круговой сегмент траектории
        # segments.append(arc)  # todo: реализовать круговые сегменты траекторий
        segments += circle_interpolate(**arc)
        p = x

    if not (p - t).is_zero(EPS):
        segments.append(dict(cls='Linear', a=p, b=t, tags=('homestretch',)))  # добавляем сегмент финишной прямой

    #alpha_, beta_ = map(degrees, (arc['alpha'], arc['beta']))
    return segments


if __name__ == '__main__':
    print pfmt(build_trajectory(
        p=Point(-10, 0),
        direction_angle=pi/2,
        velocity=5,
        t=Point(20, 10),
    ))
