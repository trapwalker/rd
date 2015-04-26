# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from pprint import pprint as pp


class Attribute(object):
    def __init__(self, value=None):
        self.name = None
        self.store_name = None
        self.default = value

    def _attach(self, cls, name):
        self.name = name
        self.value_name = '_{}'.format(name)
        setattr(cls, self.value_name, self.default)

    def __get__(self, obj, cls):
        return self if obj is None else getattr(obj, self.value_name)

    def __set__(self, obj, v):
        setattr(obj.__class__, self.value_name, v)
        

class BaseMeta(type):
    __container__ = None
    def __new__(cls, name, bases, attrs):
        pp(locals()); print
        attrs = self.__process_attrs__(name, bases, attrs)
        c = super(BaseMeta, cls).__new__(cls, name, bases, attrs)
        return c

    def __init__(self, name, bases, attrs):
        super(BaseMeta, self).__init__(name, bases, attrs)

        if self.__container__:
            self.__container__.register(self)

        self._ = self()

    def __process_attrs__(self, name, bases, attrs):
        res_attrs = {}
        for k, v in attrs:
            if isinstance(v, Attribute):
                res_attrs[k] = v
                v._attach(cls=self, name=k)                
            elif not k.startswith('_'):
                attr = None
                for b in bases:
                    if hasattr(k, b):
                        attr = getattr(k, b)
                        break
                if attr:
                    pass # todo: make
                    
                
            else:
                res_attrs[k] = v


class Container(object):
    def __init__(self):
        self.classes = {}

    def save(self, stream):
        # todo: serialization
        pass

    def register(self, cls):
        self.classes[cls.__name__] = cls
        self.__dict__[cls.__name__] = cls

    def unregister(self, cls):
        if isinstance(cls, AbstractBaseClass):
            del self.classes[cls.__name__]
            del self.__dict__[cls.__name__]
        else:
            del self.classes[cls]
            del self.__dict__[cls]
            

root = Container()


class BaseClass(object):
    __metaclass__ = BaseMeta
    __container__ = root


class A(root.BaseClass):
    x = Attribute()
        

class B(A):
    y = Attribute()

a = A()
b = B()
