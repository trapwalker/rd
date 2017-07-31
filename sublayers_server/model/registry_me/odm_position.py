# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.vectors import Point

from mongoengine import EmbeddedDocument, EmbeddedDocumentField, FloatField, StringField


class PositionField(EmbeddedDocumentField):
    def __init__(self, reinst=True, **kw):
        super(PositionField, self).__init__(document_type=Position, reinst=reinst, **kw)

    def to_python(self, value):
        # todo: string position format support (qrts, etc.)
        if isinstance(value, (list, Point)):
            return Position(value)

        return super(PositionField, self).to_python(value)

    def __set__(self, instance, value):
        if value is not None and not isinstance(value, Position):
            value = self.to_python(value)

        super(PositionField, self).__set__(instance, value)


class Position(EmbeddedDocument):
    x = FloatField()
    y = FloatField()
    # todo: generate qrts index by on_save

    def as_client_dict(self):
        return dict(x=self.x, y=self.y)

    def __nonzero__(self):
        return True

    def __init__(self, *av, **kw):
        if av:
            x, av = av[0], av[1:]
            if isinstance(x, dict):
                kw.update(x)
            elif isinstance(x, Point):
                kw.update(x.as_dict())
            elif isinstance(x, (tuple, list)) and len(x) == 2:
                kw.update(x=x[0], y=x[1])
            else:
                if av:
                    y, av = av[0], av[1:]
                else:
                    x, y = x
                kw.update(x=x, y=y)

        super(Position, self).__init__(**kw)

    def as_point(self):
        return Point(self.x, self.y)

    def __repr__(self):
        return '{self.__class__.__name__}(x={self.x!r}, y={self.y!r})'.format(self=self)

    def __str__(self):
        return '<{self.x!r}, {self.y!r}>'.format(self=self)


class RandomPosition(EmbeddedDocument):
    # todo: gaussian distribution support
    distribution = StringField(caption="Type of distribution of random value ('uniform' by default)", default='uniform')
    center = PositionField(caption="Center of segment radius [0, 0] by default")
    r_max  = FloatField(caption="Big radius of segment")
    r_min  = FloatField(caption="Small radius of segment (0 by default)", default=0)
    fi     = FloatField(caption="Azimuth to center of segment in degree (0-north by default)", default=0)
    dfi    = FloatField(caption="Angle width of segment in degree (360 degree by default)", default=360)
    comment = StringField(caption="Description of random point")

    def generate(self):
        distribution = self.distribution
        r_max = self.r_max
        assert distribution == 'uniform', 'Unsupported type of random point distribution: {!r}'.format(distribution)
        assert r_max is not None, "r_max is None. It's impossible (uniform distribution)"
        center = self.center
        center = center and center.as_point() or 0
        return Point.random_in_segment(
            r_max=r_max,
            center=center,
            r_min=self.r_min,
            fi=self.fi,
            dfi=self.dfi,
        )


class RandomPositionField(EmbeddedDocumentField):
    def __init__(self, reinst=True, **kw):
        super(RandomPositionField, self).__init__(document_type=RandomPosition, **kw)

    def to_python(self, value):
        # todo: string position format support (qrts, etc.)
        if isinstance(value, list):
            return RandomPosition(**dict(zip(value, ('r_max', 'center', 'r_min', 'fi', 'dfi', 'comment'))))

        return super(RandomPositionField, self).to_python(value)

    def __set__(self, instance, value):
        if value is not None and not isinstance(value, RandomPosition):
            value = self.to_python(value)

        super(RandomPositionField, self).__set__(instance, value)
