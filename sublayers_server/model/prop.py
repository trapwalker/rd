# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import copy_reg
from collections import Callable
from pprint import pprint as pp, pformat


class Attribute(object):
    def __init__(self, default=None, doc=None, caption=None):
        self.name = None
        self.cls = None
        self.default = default
        self.doc = doc
        self.caption = caption

    @property
    def title(self):
        assert self.name, 'Attribute is not attached'
        return self.caption or self.name

    @property
    def raw_name(self):
        return '_{}'.format(self.name)

    def __str__(self):
        return '{self.__class__.__name__}(name={self.name}, cls={self.cls})'.format(self=self)

    def __get__(self, obj, cls):
        value = getattr(obj, self.raw_name, self.default)  # todo: cascade getter
        log.debug('__get__ %s.%s() => %s', obj, self.name, value)
        return value

    def __set__(self, obj, value):
        log.debug('__set__ %s.%s = %s', obj, self.name, value)
        setattr(obj, self.raw_name, value)

    def __delete__(self, obj):
        log.debug('__gelete__ %s.%s() => %s', obj, self.name)
        delattr(obj, self.raw_name)

    def attach(self, name, cls):
        self.name = name
        self.cls = cls
        # tpdp: global attribute registration


class PersistentMeta(type):
    def __getinitargs__(cls):
        return cls.__name__, cls.__bases__, {}

    def __new__(mcs, name, bases, attrs):
        log.debug(pformat(locals()))
        c = super(PersistentMeta, mcs).__new__(mcs, name, bases, attrs)
        return c

    def __init__(cls, name, bases, attrs):
        super(PersistentMeta, cls).__init__(name, bases, attrs)
        cls.__process_attrs__()

    def __process_attrs__(self):
        overrides = {}
        for k, v in self.__dict__.items():
            if isinstance(v, Attribute):
                v.attach(name=k, cls=self)
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


class Persistent(object):
    pass


class Node(object):
    def __init__(self, name, owner=None, parent=None, attrs=None):
        self._owner = None
        self.name = name
        self.parent = parent
        self.attrs = attrs or {}
        self.owner = owner

    @property
    def path(self):
        return (self.owner.path if self.owner else ()) + (self.name)

    @property
    def fullname(self):
        return '.'.join(self.path)

    def __getattr__(self, item):
        if item in self.attrs:
            return self.attrs[item]
        if self.parent:
            return getattr(self.parent, item)
        else:
            raise AttributeError('{} has no attribute {} in parent line'.format(self.fullname, item))


if __name__ == '__main__':
    import sys
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

    from pickle import dumps, loads
    import jsonpickle as jp
    
    
