# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

import sys

if __name__ == '__main__':
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))

from attr import Attribute, DocAttribute

from collections import deque, OrderedDict
import yaml  # todo: extract serialization layer


class ThingParentLinkIsCycle(Exception):
    pass


class AttrUpdaterMeta(type):
    def __init__(cls, name, bases, attrs):
        super(AttrUpdaterMeta, cls).__init__(name, bases, attrs)
        for k, v in cls.__dict__.items():
            cls.prepare_attr(k, v)

        for k, v in cls.__dict__.items():
            cls.update_attr(k, v)

    def prepare_attr(self, name, value):
        pass

    def update_attr(self, name, value):
        pass


class PersistentMeta(AttrUpdaterMeta):

    def update_attr(self, name, value):
        super(PersistentMeta, self).update_attr(name, value)
        if isinstance(value, Attribute):
            value.attach(name=name, cls=self)


class NamespaceMeta(AttrUpdaterMeta):

    def update_attr(self, name, value):
        super(NamespaceMeta, self).update_attr(name, value)
        if isinstance(value, Node):
            value.attach(name=name, cls=self)


class Registry(object):
    def __init__(self):
        self.root = Root(name='root', registry=self, doc=u'Корневой узел реестра')
        self.items = []

    def __iter__(self):
        """Iter with consistent parent lines~"""
        q = deque(self.items)
        done = {None}
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

    def save(self, stream=None):
        # if stream is None:
        #     from io import BytesIO
        #     stream = BytesIO()

        return yaml.dump(self, stream, allow_unicode=True, default_flow_style=False, Dumper=Dumper)

    @classmethod
    def load(cls, src):
        """Load registry from src.
        @src - stream or filename
        """

        stream = src if hasattr(src, 'read') else open(src)
        try:
            return yaml.load(stream)
        finally:
            if not hasattr(src, 'read'):
                stream.close()


class Persistent(object):
    __metaclass__ = PersistentMeta


class Node(Persistent):
    # todo: override attributes in subclasses
    abstract = Attribute(default=True, caption=u'Абстракция', doc=u'Признак абстрактности узла')
    doc = DocAttribute()

    def __getstate__(self):
        do_not_store = ('registry',)
        log.debug('%s.__getstate__', self)
        d = OrderedDict(sorted((kv for kv in self.__dict__.items() if kv[0] not in do_not_store)))
        return d

    def __init__(self, name=None, parent=None, values=None, registry=None, **kw):
        super(Node, self).__init__()
        self.name = name
        self.parent = parent
        self.values = values or {}
        self.values.update(kw)
        self.childs = []  # todo: use weakref
        self.registry = registry
        if parent:
            parent._add_child(self)

    def attach(self, name, cls):
        assert self.name is None
        self.name = name
        # todo: tags apply

    def __hash__(self):
        return hash((self.registry, self.name))

    def __repr__(self):
        return '<{self.name}[{parent_name}]({overrides})>'.format(
            self=self,
            parent_name=self.parent.name if self.parent else '',
            overrides=', '.join(('{0}={1!r}'.format(*kv) for kv in sorted(self.values.items()))),
        )

    def _add_child(self, child):
        self.childs.append(child)
        child.registry = self.registry

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


class Dumper(yaml.Dumper):
    def generate_anchor(self, node):
        log.debug('gen_anchor: node=%r', node)
        if isinstance(node, Node):
            return node.name
        else:
            return super(Dumper, self).generate_anchor(node)



class Root(Node):
    pass


class Container(object):
    __metaclass__ = NamespaceMeta


if __name__ == '__main__':
    # from pprint import pprint as pp
    # from pickle import dumps, loads
    # import jsonpickle as jp
    class Car(Node):
        u"""Абстрактная машина"""
        max_velocity = Attribute(default=100, caption=u'Макс. скорость', doc=u'Максимальная скорость')


    reg = Registry()

    class C(Container):
        anyCar = Car(parent=reg.root)
        carLite = Car(parent=anyCar, doc=u'Лёгкая техника (мото-, вело-, скейт, коньки, тапки)')
        carMidle = Car(parent=anyCar, doc=u'Легковая техника')
        carHavy = Car(parent=anyCar, doc=u'Транспорт тяжелго класса (грузовики, тягачи, танки')
        carMoto = Car(parent=carLite, max_velocity=300, x=15, y=range(5))

    data = reg.save()
    fn = 'registry.rt'
    with open(fn, 'w') as f:
        f.write(data)
    print data

    reg2 = Registry.load(fn)
