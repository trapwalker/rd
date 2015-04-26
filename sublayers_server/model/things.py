# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from pprint import pprint as pp


class Attribute(object):
    def __init__(self):
        self.name = None

    def attach(self, cls, name):
        self.name = name


class BaseMeta(type):
    __container__ = None
    def __new__(cls, name, bases, attrs):
        pp(locals()); print
        c = super(BaseMeta, cls).__new__(cls, name, bases, attrs)
        return c

    def __init__(self, name, bases, attrs):
        super(BaseMeta, self).__init__(name, bases, attrs)

        self.__process_attrs__()

        if self.__container__:
            self.__container__.register(self)

    def __process_attrs__(self):
        for k, v in self.__dict__.items():
            if isinstance(v, Attribute):
                v.attach(cls=self, name=k)
    

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


    
