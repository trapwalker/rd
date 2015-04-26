# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from pprint import pprint as pp


class AttrError(Exception):
    """Abstract attribute error"""


class AttrValidationError(AttrError):
    """Attribute value validation error"""


class AttrTypeError(AttrValidationError):
    """Attribute value type error"""


class AttrValueIsNull(AttrValidationError):
    """Not nullable attribute value is None"""


class AttrValueRangeError(AttrValidationError):
    """Attribute range is missing"""


class Attribute(object):
    def __init__(self, default=None, null=True, caption=None, doc=None):
        self.name = None
        self.default = default
        self.null = null
        self.validate(default)
        self.doc = doc
        self._caption = caption

    @property
    def caption(self):
        return self._caption or self.name

    @property
    def value_name(self):
        return '_{}'.format(self.name)

    def attach(self, cls, name):
        self.name = name
        setattr(cls, self.value_name, self.default)

    def __get__(self, obj, cls):
        return self if obj is None else getattr(obj, self.value_name)

    def __set__(self, obj, v):
        self.validate(v)
        setattr(obj.__class__, self.value_name, v)

    def validate(self, value):
        if not self.null and value is None:
            raise AttrValueIsNull()


class DocStringAttr(Attribute):
    
    @property
    def value_name(self):
        return '__doc__'

    def __get__(self, obj, cls):
        return self if obj is None else getattr(cls, self.value_name)

    def __set__(self, obj, v):
        setattr(obj.__class__, self.value_name, v)
    

class StrAttr(Attribute):
    def validate(self, value):
        if value is None:
            super(StrAttr, self).validate(value)

        if not isinstance(value, basestring):
            raise AttrTypeError('Value type ({}) incompatible. basestring required'.format(type(value)))


class NumAttr(Attribute):
    def __init__(self, default=None, min_value=None, max_value=None, **kw):
        super(NumAttr, self).__init__(default=default, **kw)
        self.min_value = min_value
        self.max_value = max_value

    def validate(self, value):
        if value is None:
            super(NumAttr, self).validate(value)

        if self.min_value is not None and value < self.min_value:
            raise AttrValueRangeError('Value ({}) < of minimal ({})'.format(value, self.min_value))

        if self.max_value is not None and value > self.max_value:
            raise AttrValueRangeError('Value ({}) > of maximal ({})'.format(value, self.max_value))


class BaseMeta(type):
    __container__ = None

    def __new__(mcs, name, bases, attrs):
        pp(locals())
        print
        c = super(BaseMeta, mcs).__new__(mcs, name, bases, attrs)
        return c

    def __init__(cls, name, bases, attrs):
        super(BaseMeta, cls).__init__(name, bases, attrs)

        cls._ = cls()

        cls.__process_attrs__()

        if cls.__container__:
            cls.__container__.register(cls)

    def __process_attrs__(self):
        overrides = {}
        for k, v in self.__dict__.items():
            if isinstance(v, Attribute):
                v.attach(cls=self, name=k)
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
        if isinstance(cls, BaseClass):
            del self.classes[cls.__name__]
            del self.__dict__[cls.__name__]
        else:
            del self.classes[cls]
            del self.__dict__[cls]
            

root = Container()


class BaseClass(object):
    __metaclass__ = BaseMeta
    __container__ = root


class A(BaseClass):
    x = Attribute(3)
        

class B(A):
    y = Attribute(4)
    x = 33
    

a = A()
b = B()
