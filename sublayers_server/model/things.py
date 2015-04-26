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
        c = super(BaseMeta, cls).__new__(cls, name, bases, attrs)
        return c

    def __init__(self, name, bases, attrs):
        super(BaseMeta, self).__init__(name, bases, attrs)

        self._ = self()

        self.__process_attrs__()

        if self.__container__:
            self.__container__.register(self)

    def __process_attrs__(self):
        overrides = {}
        for k, v in self.__dict__.items():
            if isinstance(v, Attribute):
                v._attach(cls=self, name=k)                
            elif (
                not k.startswith('_')
                and hasattr(super(self, self), k)
                and isinstance(getattr(super(self, self), k), Attribute)
                and not isinstance(v, Attribute)
            ):
                overrides[k] = v

        for k, v in overrides.items():
            print 'override', k, v
            delattr(self, k)  # todo: фильтровать перекрытия до инстанцирования вместо удаления после
            setattr(self._, k, v)
               

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
    x = Attribute(3)
        

class B(A):
    y = Attribute(4)
    x = 33
    

a = A()
b = B()
