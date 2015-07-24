# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from attr import Attribute, DocAttribute

from collections import deque, OrderedDict, namedtuple
import yaml  # todo: extract serialization layer
import os


PROTOCOL_PREFIX = 'reg://'


class RegistryError(Exception):
    pass


class NodeClassError(RegistryError):
    pass


class ThingParentLinkIsCycle(RegistryError):
    pass


class RegistryNodeFormatError(RegistryError):
    pass


class RegistryNodeNotFound(RegistryError):
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

    classes = {}

    def __init__(cls, name, bases, attrs):
        super(PersistentMeta, cls).__init__(name, bases, attrs)
        cls.classes[name] = cls

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
    def __init__(self, path=None):
        self.path = path
        if path is None:
            self.root = Root(name='root', registry=self, doc=u'Корневой узел реестра')
        else:
            self.root = self.load(path)

    def get(self, index, default=None):
        try:
            return self[index]
        except RegistryNodeNotFound:
            return default

    def __getitem__(self, item):
        if isinstance(item, str):
            uri = item
            uri = uri.rstrip('/')
            if uri.startswith(PROTOCOL_PREFIX):
                uri = uri[len(PROTOCOL_PREFIX):]
            path = uri.split('/') if uri else []
        else:
            path = list(item)

        if path and path[0] == 'root':
            path = path[1:]

        node = self.root
        while path:
            name = path.pop(0)
            next_node = node.childs.get(name)
            if next_node is None:
                raise RegistryNodeNotFound('Node "{}" is not found in the node "{}" by link: {}'.format(
                    name, node.name, item))
            node = next_node

        return node

    def _load_node(self, path, parent):
        attrs = {}
        for f in os.listdir(path):
            p = os.path.join(path, f)
            if not f.startswith('_') and os.path.isfile(p):
                with open(p) as attr_file:
                    try:
                        d = yaml.load(attr_file)  # todo: exceptions
                    except yaml.ScannerError as e:
                        raise RegistryNodeFormatError(e)
                    attrs.update(d)

        cls = None
        class_name = attrs.pop('__cls__', None)
        if class_name:
            cls = Root.classes.get(class_name)  # todo: get classes storage namespace with other way
            if cls is None:
                raise NodeClassError(
                    'Unregistered registry class ({}) found into the path: {}'.format(class_name, path))
        cls = cls or parent and parent.__class__
        if cls is None:
            raise NodeClassError('Node class unspecified on path: {}'.format(path))
        name = attrs.pop('name', os.path.basename(path.strip('\/')))  # todo: check it
        return cls(name=name, parent=parent, registry=self, values=attrs)

    def load(self, path):
        root = None
        stack = deque([(path, None)])
        while stack:
            pth, parent = stack.pop()
            node = self._load_node(pth, parent)
            if node:
                if parent is None:
                    root = node  # todo need refactoring
                for f in os.listdir(pth):
                    next_path = os.path.join(pth, f)
                    if os.path.isdir(next_path) and not f.startswith('#') and not f.startswith('_'):
                        stack.append((next_path, node))
        return root


class Persistent(object):
    __metaclass__ = PersistentMeta


class Node(Persistent):
    # todo: override attributes in subclasses
    abstract = Attribute(default=True, caption=u'Абстракция', doc=u'Признак абстрактности узла')
    doc = DocAttribute()

    def __getstate__(self):
        do_not_store = ('registry', 'childs',)
        log.debug('%s.__getstate__', self)
        d = OrderedDict(sorted((kv for kv in self.__dict__.items() if kv[0] not in do_not_store)))
        return d

    @property
    def path_tuple(self):
        # todo: cache
        if self is self.registry.root:
            return ()
        else:
            parent = self.parent
            return (parent.path_tuple if parent else ()) + (self.name,)

    @property
    def path(self):
        return '/'.join(self.path_tuple)

    @property
    def uri(self):
        return '{}{}'.format(PROTOCOL_PREFIX, self.path)

    def __init__(self, name=None, parent=None, values=None, registry=None, **kw):
        super(Node, self).__init__()
        self.name = name
        self.parent = parent
        self.values = values or {}
        self.values.update(kw)
        self.childs = {}  # todo: use weakref
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
        self.childs[child.name] = child
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
    pass

