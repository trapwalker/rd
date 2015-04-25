# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


from pprint import pprint as pp

def load():
    pass


class BaseMeta(type):

    def f(self):
        return 13

    x = property(f)
    


class ThingMeta(type):
    '''def __new__(cls, name, parents, kw):
        pp(locals())
        del kw['__metaclass__']
        c = type(name, parents, kw)
        return c'''

    def __call__(self, name, parents, kw):
        print 'call'
        pp(locals())
        return super(ThingMeta, self).__call__(name, parents, kw)

#__metaclass__ = ThingMeta

class C(object):
    __metaclass__ = ThingMeta
    x=13
    @property
    def y(self):
        return self.x+1


class D(C):
    #__metaclass__ = ThingMeta
    x=5
    @property
    def z(self):
        return self.y*2
