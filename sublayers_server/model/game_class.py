# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from collections import Callable
from pprint import pprint as pp, pformat


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


class AttributeMeta(type):
    def __call__(cls, *av, **kw):
        obj = super(AttributeMeta, cls).__call__(*av, **kw)  # make singleton instance
        if not isinstance(obj.default, Callable):
            obj.validate(obj.default)
        return obj


class Attribute(object):
    __metaclass__ = AttributeMeta
    def __init__(self, default=None, null=True, caption=None, doc=None):
        '''
            default - value or callable object like `lambda attr, obj, cls: None`
        '''
        self.name = None
        self.default = default
        self.null = null
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
        #setattr(cls, self.value_name, self.default)

    def __get__(self, obj, cls):
        # todo: proxy attr instance to provide 'value' property of singleton
        if obj is None:
            return self

        try:
            return getattr(obj, self.value_name)
        except AttributeError:
            if isinstance(self.default, Callable):
                return self.default(self, obj, cls)
            else:
                return self.default
            
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
    def __init__(self, default=None, min=None, max=None, **kw):
        super(NumAttr, self).__init__(default=default, **kw)
        self.min = min
        self.max = max

    def validate(self, value):
        if value is None:
            super(NumAttr, self).validate(value)

        if self.min is not None and value < self.min:
            raise AttrValueRangeError('Value ({}) < of minimal ({})'.format(value, self.min))

        if self.max is not None and value > self.max:
            raise AttrValueRangeError('Value ({}) > of maximal ({})'.format(value, self.max))


class BaseMeta(type):
    __container__ = None

    def __new__(mcs, name, bases, attrs):
        log.debug(pformat(locals()))
        c = super(BaseMeta, mcs).__new__(mcs, name, bases, attrs)
        return c

    def __call__(cls, *av, **kw):
        return cls._

    def __init__(cls, name, bases, attrs):
        super(BaseMeta, cls).__init__(name, bases, attrs)

        cls._ = super(BaseMeta, cls).__call__()  # make singleton instance

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
            log.debug('override %s=%s', k, v)
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


if __name__ == '__main__':
    import sys
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))
    
    class A(BaseClass):
        name = StrAttr(default=lambda attr, obj, cls: cls.__name__, caption=u'Имя', doc=u'Имя класса. Должно быть идентификатором.')
        x = NumAttr(3, max=40)
        

    class B(A):
        y = Attribute(4)
        x = 33

    a = A()
    b = B()
    
