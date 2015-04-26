# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from pprint import pprint as pp

def load():
    pass


class BaseMeta(type):
    def __new__(cls, name, bases, attrs):
        pp(locals())
        c = super(ThingMeta, cls).__new__(cls, name, bases, attrs)
        return c

    def __init__(self, name, bases, attrs):
        super(ThingMeta, self).__init__(name, bases, attrs)

        # classregistry.register(self, self.interfaces)
        print "Would register class %s now." % self
        print

        
class Base(object):
    __metaclass__ = BaseMeta


class C(Base):
    pass


class D(C):
    pass
