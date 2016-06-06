# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.tree import Node
from sublayers_server.model.registry.uri import URI

from collections import deque
from uuid import uuid4 as uid_func
import pickle
import time
import yaml
import yaml.scanner  # todo: extract serialization layer
import os


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


class Root(Node):
    pass


class AbstractStorage(object):

    def __init__(self, name=None, dispatcher=None):
        self.nodes_count = 0
        self.name = name
        self.dispatcher = dispatcher
        if dispatcher:
            dispatcher.add_storage(self)

    uri_protocol = URI_PROTOCOL

    @staticmethod
    def gen_uid():
        return uid_func()

    def get_node(self, uri):
        """
        @param URI|str uri: Link to the node
        """
        if isinstance(uri, basestring):
            log.warning('AbstractStorage.get_node used by raw string URI')
            uri = URI(uri)

        if uri.storage is None or uri.storage == self.name:
            # todo: test protocol
            return self.get_local(uri.path)

        dispatcher = self.dispatcher
        if dispatcher:
            return dispatcher.get_node(uri)

        raise WrongStorageError("Can't resolve storage {!r}".format(uri.storage))

    def __getitem__(self, item):
        """
        @rtype: Node
        @return: Registry node, resolved by URI
        """
        if isinstance(item, basestring):
            item = URI(item)  # todo: optimize избавиться от неоднозначности строка/uri

        if not isinstance(item, URI):
            item = URI(scheme=URI_PROTOCOL, path=list(item))

        return self.get_node(item)

    def get(self, index, default=None):
        try:
            return self[index]
        except ObjectNotFound:
            return default

    def get_uri(self, node):
        return URI(scheme=self.uri_protocol, storage=self.name, path=self.get_path_tuple(node))

    def close(self):
        dispatcher = self.dispatcher
        if dispatcher:
            dispatcher.remove_storage(self)
            self.dispatcher = None

    def get_local(self, path):
        raise NotImplementedError('Unimplemented abstract method')

    def put(self, node):
        self.nodes_count += 1

    def get_path_tuple(self, node):
        raise NotImplementedError('Unimplemented abstract method')

    def save_node(self, node):
        raise NotImplementedError('Unimplemented abstract method')


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

    def get_node(self, uri):
        try:
            # log.debug('Try to get storage "{}"'.format(uri.storage))
            storage_obj = self.storage_map[uri.storage]
        except KeyError:
            raise StorageNotFound('Storage {!r} not found. [{}] avalable'.format(
                uri.storage, ', '.join(self.storage_map.keys())))

        return storage_obj.get_local(uri.path)

    def save_node(self, node):
        raise Exception('Method is not supported by this storage type')


class Collection(AbstractStorage):
    def __init__(self, db, **kw):
        super(Collection, self).__init__(dispatcher=Node.DISPATCHER, **kw)

        assert self.name  # todo: рассмотреть возможность сделать name обязательным параметром конструктора
        self.dataset = db[self.name]

    def make_key(self, path):
        key = path if isinstance(path, basestring) else ('/' + '/'.join(path))
        if isinstance(key, unicode):
            key = key.encode('utf-8')
        return key

    def get_local(self, path):
        key = self.make_key(path)
        rec = self.dataset.find_one({'name': key})  # todo: migrate to async ODM
        if rec is None:
            raise ObjectNotFound('Object not found by key={!r}'.format(key))

        node = self._deserialize(rec['data'])
        node.storage = self
        return node

    def _deserialize(self, data):
        # todo: Перейти на MongoDB
        return pickle.loads(data)

    def _serialize(self, node):
        return pickle.dumps(node)

    def put(self, node):
        super(Collection, self).put(node)
        key = self.make_key(node.uri.path)
        doc = dict(name=key, data=self._serialize(node))
        self.dataset.update({'name': key}, doc, upsert=True)  # todo: db index

    def get_path_tuple(self, node):
        return [node.name]

    def save_node(self, node):
        self.put(node)


# noinspection PyProtectedMember
class Registry(AbstractStorage):
    def __init__(self, path=None, **kw):
        super(Registry, self).__init__(dispatcher=Node.DISPATCHER, **kw)
        self.path = path
        log.info('Registry loading...')
        t = time.time()
        self.root = Root(name='root', storage=self, doc=u'Корневой узел реестра') if path is None else self.load(path)
        t = time.time() - t
        log.info('Registry loading DONE: {} nodes ({:.0f}s).'.format(self.nodes_count, t))

    def get_local(self, path):
        path = list(path)
        node = self.root
        while path:
            name = path.pop(0)
            next_node = node._subnodes.get(name)
            if next_node is None:
                raise ObjectNotFound('Node {!r} is not found in the node {!r} by path: {!r}'.format(
                    name, node.name, path))
            node = next_node

        return node

    def put(self, node):
        super(Registry, self).put(node)
        if not hasattr(node, '_subnodes'):
            node._subnodes = {}

        owner = node.owner
        if owner:
            assert owner.storage is self
            owner._subnodes[node.name] = node
        else:
            self.root = node

    def _load_node(self, path, owner):
        assert isinstance(path, unicode)
        attrs = {}
        for f in os.listdir(path):
            assert isinstance(f, unicode)
            # f = f.decode(sys.getfilesystemencoding())
            p = os.path.join(path, f)
            if not f.startswith('_') and os.path.isfile(p):  # todo: filter yaml-files
                with open(p) as attr_file:
                    try:
                        d = yaml.load(attr_file) or {}
                    except yaml.scanner.ScannerError as e:
                        raise RegistryNodeFormatError(e)
                    attrs.update(d)

        cls = None
        class_name = attrs.pop('__cls__', None)
        if class_name:
            cls = Root.classes.get(class_name)  # todo: get classes storage namespace with other way
            if cls is None:
                raise NodeClassError(
                    'Unknown registry class ({}) found into the path: {!r}'.format(class_name, path))

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
            raise NodeClassError('Node class unspecified on path: {!r}'.format(path))
        name = attrs.pop('name', os.path.basename(path.strip('\/')))  # todo: check it
        abstract = attrs.pop('abstract', True)  # todo: Вынести это умолчание на видное место
        return cls(name=name, parent=parent, owner=owner, storage=self, abstract=abstract, values=attrs)

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

    def save_node(self, node):
        raise Exception('Method is not supported by this storage type')  # todo: Use other exception class


Node.DISPATCHER = Dispatcher()  # todo: remove singleton (!)
