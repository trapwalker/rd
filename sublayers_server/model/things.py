# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


class Attribute(object):
    def __init__(self, name):
        pass


class ThingMeta(type):
    def __new__(cls, name, parents, kw):
        print 'cls={cls}\nname={name}\nparents={parents}\!Tempnkw={kw}'.format(**locals())
        c = type(name, parents, kw)
        return c


class BaseThingClass(object):
    container = None
    def __init__(self, name, parent=None, attrs=None):
        self.name = name
        self.parent = parent
        self.attrs = attrs or []
        assert self.container
        self.container.register(self)

    def __del__(self):
        log.warning('ThingClass deletion! [__del__]')
        self.container.unregister(self)


class Container(object):
    def __init__(self):
        self.ThingClass = type('ThingClass', (BaseThingClass,), dict(container=self))
        self.classes = {}

    def save(self, stream):
        # todo: serialization
        pass

    def register(self, thing_class):
        self.classes[thing_class.name] = thing_class

    def unregister(self, thing_class):
        if isinstance(thing_class, BaseThingClass):
            del self.classes[thing_class.name]
        else:
            del self.classes[thing_class]


root = Container()


class P(object):
    def __init__(self, name):
        self.name = name
        
    def __get__(self, obj, cls):
        print 'get', self, obj, cls
        return 13
    
    def __set__(self, obj, v):
        print 'set', self, obj, v
        

class C(object):
    x = P('x')

c = C()    
    
