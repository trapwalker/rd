# -*- coding: utf-8 -*-



class Tag(object):
    """This simple TAG! Not Used this Tag! Abstract Tag!"""
    def __str__(self):
        return self.__doc__


class VehicleTag(Tag):
    """Used for determine Vehicle objects"""


class VehicleFlyingTag(Tag):
    """Used for determine Flying Vehicle objects"""


class RocketTag(Tag):
    """Used for determine Rocket object"""


class UnZoneTag(Tag):
    """Object is not affected by zones"""


class UnAltitudeTag(Tag):
    """Object is not affected by zones Altitude"""


if __name__ == '__main__':
    t = Tag()
    print(t)
    v = VehicleFlyingTag()
    print(v)