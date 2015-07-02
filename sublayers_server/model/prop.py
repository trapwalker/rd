# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import sys

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

#import copy_reg
from collections import deque
from pprint import pformat


# todo: override attributes in subclasses

class Attribute(object):
    def __init__(self, default=None, doc=None, caption=None):
        # todo: add param: null
        self.name = None
        self.cls = None
        self.default = default
        self.doc = doc
        self.caption = caption

    @property
    def title(self):
        assert self.name, 'Attribute is not attached'
        return self.caption or self.name

    def __str__(self):
        return '{self.__class__.__name__}(name={self.name}, cls={self.cls})'.format(self=self)

    def __get__(self, obj, cls):
        value = obj._get_attr_value(self.name, self.default)  # todo: cascade getter
        log.debug('__get__ %s.%s() => %s', obj, self.name, value)
        return value

    def __set__(self, obj, value):
        log.debug('__set__ %s.%s = %s', obj, self.name, value)
        obj._set_attr_value(self.name, value)

    def __delete__(self, obj):
        log.debug('__gelete__ %s.%s() => %s', obj, self.name)
        obj._del_attr_value(self.name)

    def attach(self, name, cls):
        self.name = name
        self.cls = cls
        # todo: global attribute registration

# todo: reserved attr names checking


class DocAttribute(Attribute):
    def __init__(self):
        super(DocAttribute, self).__init__(caption=u'Описание', doc=u'Описание узла')

    def __get__(self, obj, cls):
        default = cls.__doc__
        value = obj._get_attr_value(self.name, self.default or default)  # todo: cascade getter
        return value


class PersistentMeta(type):
    def __getinitargs__(cls):
        return cls.__name__, cls.__bases__, {}

    def __new__(mcs, name, bases, attrs):
        log.debug(pformat(locals()))
        c = super(PersistentMeta, mcs).__new__(mcs, name, bases, attrs)
        return c

    def __init__(cls, name, bases, attrs):
        super(PersistentMeta, cls).__init__(name, bases, attrs)
        # cls.__process_attrs__()

    def __process_attrs__(self):
        for k, v in self.__dict__.items():
            if isinstance(v, Attribute):
                v.attach(name=k, cls=self)


class ThingParentLinkIsCycle(Exception):
    pass


class ContainerMeta(type):
    def __init__(cls, name, bases, attrs):
        super(ContainerMeta, cls).__init__(name, bases, attrs)
        cls.__process_attrs__()

    def __process_attrs__(self):
        for k, v in self.__dict__.items():
            if isinstance(v, Node):
                v._attach_to_container(container=self, name=k)

    def save(cls, stream):
        for c in cls:
            c.save(stream)

    def __iter__(cls):
        """Iter with consistent parent lines"""
        q = deque()
        done = {None}
        q.extend((c for c in cls.__dict__.values() if isinstance(c, Node)))
        cnt = 0
        while q:
            c = q.pop()
            if c.parent in done:
                yield c
                done.add(c)
                cnt = 0
            else:
                q.appendleft(c)
                cnt += 1
                if cnt > len(q):
                    raise ThingParentLinkIsCycle()


class Persistent(object):
    __metaclass__ = PersistentMeta


class Node(Persistent):
    abstract = Attribute(default=True, caption=u'Абстракция', doc=u'Признак абстрактности узла')
    doc = DocAttribute()

    def _attach_to_container(self, container, name):
        self.container = container
        if self.name is None:
            self.name = name

    def __init__(self, name=None, parent=None, abstract=False, values=None, container=None, **kw):
        super(Node, self).__init__()
        self.name = name
        self.parent = parent
        self.values = values or {}
        self.values.update(kw)
        self.childs = []  # todo: use weakref
        self.container = container
        if parent:
            parent._add_child(self)

    def __hash__(self):
        return hash((self.container, self.name))

    def __repr__(self):
        return '<{self.container.__name__}.{self.name}[{parent_name}]>'.format(
            self=self,
            parent_name=self.parent.name if self.parent else '',
        )

    def _add_child(self, child):
        self.childs.append(child)

    def _get_attr_value(self, name, default):
        if name in self.values:
            return self.values[name]
        if self.parent:
            return self.parent._get_attr_value(name, default)
        else:
            return default

    def _set_attr_value(self, name, value):
        self.values[name] = value

    def _del_attr_value(self, name):
        del(self.values[name])

    def _has_attr_value(self, name):
        return name in self.values

    def save(self, stream):
        stream.write(repr(self))
        stream.write('\n')


class Container(object):
    __metaclass__ = ContainerMeta


if __name__ == '__main__':
    from pprint import pprint as pp
    # from pickle import dumps, loads
    # import jsonpickle as jp
    class Car(Node):
        u"""Абстрактная машина"""
        max_velocity = Attribute(default=100, caption=u'Макс. скорость', doc=u'Максимальная скорость транспортного средства')

    class C(Container):
        anyCar = Car()
        carLite = Car(parent=anyCar, doc=u'Лёгкая техника (мото-, вело-, скейт, коньки, тапки)')
        carMidle = Car(parent=anyCar, doc=u'Легковая техника')
        carHavy = Car(parent=anyCar, doc=u'Транспорт тяжелго класса (грузовики, тягачи, танки')
        carMoto = Car(parent=carLite)

