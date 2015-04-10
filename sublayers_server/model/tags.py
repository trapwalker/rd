# -*- coding: utf-8 -*-



class Tag(object):
    u"""This simple TAG! Not Used this Tag! Abstract Tag!"""
    def __str__(self):
        return self.__doc__


class VehicleTag(Tag):
    u"""Used for determine Vehicle objects"""


class VehicleFlyingTag(Tag):
    u"""Used for determine Flying Vehicle objects"""


class RocketTag(Tag):
    u"""Used for determine Rocket object"""


class UnZoneTag(Tag):
    u"""Object is not affected by zones"""


class UnAltitudeTag(Tag):
    u"""Object is not affected by zones Altitude"""


if __name__ == '__main__':
    t = Tag()
    print t
    v = VehicleFlyingTag()
    print v