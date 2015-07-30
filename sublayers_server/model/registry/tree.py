# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from attr import Attribute, DocAttribute

from collections import deque, OrderedDict
import shelve
from uuid import uuid4 as uid_func
import yaml
import yaml.scanner  # todo: extract serialization layer
import os
import re


URI_PROTOCOL = 'reg'


class RegistryError(Exception):
    pass


class NodeClassError(RegistryError):
    pass


class ThingParentLinkIsCycle(RegistryError):
    pass


class RegistryNodeFormatError(RegistryError):
    pass


class RegistryLinkFormatError(RegistryError):
    pass


class ObjectNotFound(RegistryError):
    pass


class WrongStorageError(RegistryError):
    pass


class StorageNotFound(RegistryError):
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


class AbstractStorage(object):

    def __init__(self, name=None, dispatcher=None):
        self.name = name
        self.dispatcher = dispatcher
        if dispatcher:
            dispatcher.add_storage(self)

    uri_protocol = URI_PROTOCOL

    _RE_URI = re.compile(r'''
        ^
        (?:(?P<proto>\w+)://)?
        (?P<storage>[^/]+)?
        (?P<path>(?:/\w+)*)
        (?P<tail_slash>/)?
        $
    ''', re.X)

    @classmethod
    def parse_uri(cls, uri):
        """Parse uri like 'protocol://path/to/the/some/object'
        and return tuple like: ('protocol', ['path', 'to', 'the', 'some', 'object'])
        """
        m = cls._RE_URI.match(uri)
        if m is None:
            raise RegistryLinkFormatError('Wrong link format: "{}"'.format(uri))

        d = m.groupdict()
        proto = d.get('proto')
        storage = d.get('storage')
        path = d.get('path', '')
        path = path.split('/')
        return proto, storage, path

    @staticmethod
    def gen_uid():
        return uid_func()

    def get_node(self, proto, storage, path):
        if storage is None or storage == self.name:
            # todo: test protocol
            return self.get_local(path)

        dispatcher = self.dispatcher
        if dispatcher:
            return dispatcher.get_node(proto=proto, storage=storage, path=path)

        raise WrongStorageError("Can't resolve storage {}".format(storage))

    def __getitem__(self, item):
        proto, storage, path = self.parse_uri(item) if isinstance(item, str) else (URI_PROTOCOL, None, list(item))
        return self.get_node(proto, storage, path)

    def get(self, index, default=None):
        try:
            return self[index]
        except ObjectNotFound:
            return default

    def get_path(self, node):
        return '/' + '/'.join(self.get_path_tuple(node))

    def get_uri(self, node):
        return '{}://{}{}'.format(self.uri_protocol, self.name or '', self.get_path(node))

    def close(self):
        dispatcher = self.dispatcher
        if dispatcher:
            dispatcher.remove_storage(self)
            self.dispatcher = None

    def get_local(self, path):
        raise Exception('Unimplemented abstract method')

    def put(self, node):
        raise Exception('Unimplemented abstract method')

    def get_path_tuple(self, node):
        raise Exception('Unimplemented abstract method')


class Dispatcher(AbstractStorage):
    def __init__(self, storage_list=None, **kw):
        super(Dispatcher, self).__init__(**kw)
        self.storage_map = {}
        if storage_list:
            for storage in storage_list:
                self.add_storage(storage)

    def add_storage(self, storage):
        self.storage_map[storage.name] = storage
        # todo: set dispatcher to storage

    def remove_storage(self, storage):
        name = storage if isinstance(storage, basestring) else storage.name
        del(self.storage_map[name])

    def get_node(self, proto, storage, path):
        try:
            storage_obj = self.storage_map[storage]
        except KeyError:
            raise StorageNotFound('Storage {} not found. [{}] avalable'.format(
                storage, ', '.join(self.storage_map.keys())))

        return storage_obj.get_local(path)


class Collection(AbstractStorage):
    def __init__(self, path, **kw):
        super(Collection, self).__init__(**kw)
        self.path = path
        self._raw_storage = {}  # shelve.open(path)  # todo: make persistent

    def make_key(self, path):
        return path if isinstance(path, basestring) else ('/' + '/'.join(path))

    def close(self):
        self._raw_storage.close()
        super(Collection,self).close()

    def get_local(self, path):
        # todo: refactoring
        if path and path[0] == '':
            path = path[1:]
        return self._raw_storage[self.make_key(path)]

    def put(self, node):
        key = self.make_key(node.path)
        self._raw_storage[key] = node

    def get_path_tuple(self, node):
        return [node.name]


# noinspection PyProtectedMember
class Registry(AbstractStorage):
    def __init__(self, path=None, **kw):
        super(Registry, self).__init__(**kw)
        self.path = path
        self.root = Root(name='root', storage=self, doc=u'Корневой узел реестра') if path is None else self.load(path)

    def get_local(self, path):
        if path and path[0] == '':
            path = path[1:]

        node = self.root
        while path:
            name = path.pop(0)
            next_node = node._subnodes.get(name)
            if next_node is None:
                raise ObjectNotFound('Node "{}" is not found in the node "{}" by path: {}'.format(
                    name, node.name, path))
            node = next_node

        return node

    def put(self, node):
        if not hasattr(node, '_subnodes'):
            node._subnodes = {}

        owner = node.owner
        if owner:
            assert owner.storage is self
            owner._subnodes[node.name] = node
        else:
            self.root = node

    def _load_node(self, path, owner):
        attrs = {}
        for f in os.listdir(path):
            p = os.path.join(path, f)
            if not f.startswith('_') and os.path.isfile(p):
                with open(p) as attr_file:
                    try:
                        d = yaml.load(attr_file)
                    except yaml.scanner.ScannerError as e:
                        raise RegistryNodeFormatError(e)
                    attrs.update(d)

        cls = None
        class_name = attrs.pop('__cls__', None)
        if class_name:
            cls = Root.classes.get(class_name)  # todo: get classes storage namespace with other way
            if cls is None:
                raise NodeClassError(
                    'Unknown registry class ({}) found into the path: {}'.format(class_name, path))

        # todo: get parent
        parent = None
        parent_addr = attrs.pop('__parent__', None)
        if parent_addr:
            parent = self.get(parent_addr, None)
            if parent is None:
                raise ObjectNotFound("Can't resolve parent link")  # todo: make lazy resolving

        if parent is None:  # todo: make option 'owner_is_parent_by_default'
            parent = owner

        cls = cls or parent and parent.__class__
        if cls is None:
            raise NodeClassError('Node class unspecified on path: {}'.format(path))
        name = attrs.pop('name', os.path.basename(path.strip('\/')))  # todo: check it
        return cls(name=name, parent=parent, owner=owner, storage=self, values=attrs)

    def load(self, path):
        root = None
        stack = deque([(path, None)])
        while stack:
            pth, owner = stack.pop()
            node = self._load_node(pth, owner)
            if node:
                if owner is None:
                    root = node  # todo: optimize
                for f in os.listdir(pth):
                    next_path = os.path.join(pth, f)
                    if os.path.isdir(next_path) and not f.startswith('#') and not f.startswith('_'):
                        stack.append((next_path, node))
        return root

    def get_path_tuple(self, node):
        # todo: cache
        path = []
        while node is not self.root:
            assert node.storage is self, 'THis node from other storage'
            path.append(node.name)
            node = node.owner

        path.reverse()
        return path


class Persistent(object):
    __metaclass__ = PersistentMeta


class Node(Persistent):
    # todo: override attributes in subclasses
    abstract = Attribute(default=True, caption=u'Абстракция', doc=u'Признак абстрактности узла')
    doc = DocAttribute()

    def __init__(self, name=None, parent=None, values=None, storage=None, owner=None, **kw):
        """
        @param str name: Name of node
        @param Node parent: Parent of node
        @param dict values: Override attributes values dict
        @param AbstractStorage storage: Storage o this node
        @param Node owner: Owner of node in dhe tree
        """
        super(Node, self).__init__()
        self._cache = {}
        self.name = name
        self.parent = parent  # todo: parent must be an Attribute (?)
        self.owner = owner
        self.values = values or {}
        self.values.update(kw)
        self.storage = storage
        if storage:
            storage.put(self)

    def instantiate(self, storage, name=None):
        # todo: test to abstract sign
        # todo: clear abstract sign
        name = name or storage.gen_uid().get_hex()
        inst = self.__class__(name=name, storage=storage, parent=self)
        return inst

    def __getstate__(self):
        do_not_store = ('storage', '_subnodes',)
        log.debug('%s.__getstate__', self)
        d = OrderedDict(sorted((kv for kv in self.__dict__.items() if kv[0] not in do_not_store)))
        return d

    @property
    def path(self):
        return self.storage.get_path(self)

    @property
    def uri(self):
        return self.storage.get_uri(self)

    # noinspection PyUnusedLocal
    def attach(self, name, cls):
        assert self.name is None
        self.name = name
        # todo: tags apply

    def __hash__(self):
        return hash((self.storage, self.name))

    def __repr__(self):
        # todo: make correct representation
        return '<{self.uri}>'.format(self=self)

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


if __name__ == '__main__':
    # from pprint import pprint as pp
    # from pickle import dumps, loads
    # import jsonpickle as jp
    pass
