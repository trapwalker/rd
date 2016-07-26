# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from tornado.concurrent import return_future
from motorengine.errors import LoadReferencesRequiredError
from uuid import uuid1 as get_uuid
from weakref import WeakSet
from fnmatch import fnmatch
from collections import deque, Counter
from pprint import pformat
from functools import partial
import time
import yaml
import yaml.scanner
import os

from sublayers_server.model.registry.uri import URI
from sublayers_server.model.registry.odm import AbstractDocument
from sublayers_server.model.registry.odm.fields import (
    StringField, ListField, BooleanField, UUIDField,
    UniReferenceField,
)
from sublayers_server.model.registry.odm.doc import _call_stat


class RegistryError(Exception):
    pass


class RegistryNodeFormatError(RegistryError):
    pass


class Node(AbstractDocument):
    # todo: make sparse indexes
    # todo: override attributes in subclasses
    uid = UUIDField(default=get_uuid, unique=True)
    title = StringField(caption=u"Название", tags='client')
    fixtured = BooleanField(default=False, doc=u"Признак предопределенности объекта из файлового репозитория")
    uri = StringField(unique=True)
    abstract = BooleanField(default=True, doc=u"Абстракция - Признак абстрактности узла")
    parent = UniReferenceField(reference_document_type='sublayers_server.model.registry.tree.Node')
    owner = UniReferenceField(reference_document_type='sublayers_server.model.registry.tree.Node')
    can_instantiate = BooleanField(default=True, doc=u"Инстанцируемый - Признак возможности инстанцирования")
    name = StringField()
    doc = StringField()
    tags = ListField(base_field=StringField(), caption=u"Теги", doc=u"Набор тегов объекта", tags="client")

    def make_uri(self):
        owner = self.owner
        if owner is None and self.parent:  # Корневые элементы с предком -- это, скорее всего, субдокументы. URI нет.
            return
        assert not owner or owner.uri, '{}.make_uri without owner.uri'.format(self)
        path = (owner and owner.uri and URI(owner.uri).path or ()) + (self.name or ('+' + self.id_),)
        return URI(
            scheme='reg',
            #storage=self.__class__.__collection__,
            path=path,
        )

    def to_cache(self):
        # assert self.uri, "Can't cache without URI"
        # if not self.uri:
        #     log.warning('Trying to cache object without URI: {!r}'.format(self))
        super(Node, self).to_cache(self.uri)

    def __init__(self, embedded=False, **kw):
        """
        @param str name: Name of node
        @param Node parent: Parent of node
        @param Node owner: Owner of node in dhe tree
        @param bool abstract: Abstract sign of node
        """
        #_id=kw.pop('_id', ObjectId()),
        super(Node, self).__init__(**kw)
        if self.uri is None and not embedded:  # todo: make_uri по-другому проверяет является ли объект встроенным.
            uri = self.make_uri()
            self.uri = uri and str(uri)

        self._subnodes = WeakSet()

    def __getitem__(self, idx):
        path = None
        # todo: test to URI
        if isinstance(idx, basestring):
            path = idx.split('/')
        else:
            path = idx

        if path:
            child_name = path[0]
            for node in self._subnodes:
                if node.name == child_name:
                    return node[path[1:]]
        else:
            return self

    def __setattr__(self, name, value):
        if name in ['_subnodes']:
            return object.__setattr__(self, name, value)

        return super(Node, self).__setattr__(name, value)

    def __getattribute__(self, name):
        # required for the next test
        if (
            name in (  # todo: Убрать из этого списка все, кроме _fields
                '_fields', '_subnodes',
                'is_reference_field', 'find_list_field', 'find_reference_field', 'is_embedded_field', 'is_list_field',
                'find_embed_field', '_values', '__class__', '_get_load_function', 'fill_values_collection',
                'handle_load_reference', 'find_references', '_reference_loaded_fields', '_bypass_load_function',
                'get_global_class_name', 'make_uri',
                'load_references', 'instantiate', 'to_cache',
            )
        ):
            return object.__getattribute__(self, name)

        # if __debug__:
        #     _call_stat[(Node.__getattr__', name)] += 1

        if name in self._fields:
            field = self._fields[name]
            is_reference_field = self.is_reference_field(field)
            value = field.get_value(self._values.get(name, None))

            if value is None and name not in {'parent', 'owner', 'uri'}:
                parent = self.parent
                value = getattr(parent, name, None)  # todo: may be exception need?

            if field.required and value is None:
                log.warning(
                    'Required value %s of %s is not defined in property owner class %s',
                    name, self, self.__class__,
                )

            if is_reference_field and value is not None and not isinstance(value, field.reference_type):
                message = "The property '%s' can't be accessed before calling 'load_references'" + \
                    " on its instance first (%s) or setting __lazy__ to False in the %s class."

                raise LoadReferencesRequiredError(
                    message % (name, self.__class__.__name__, self.__class__.__name__)
                )

            return value

        return object.__getattribute__(self, name)

    @property
    def id(self):
        return str(self._id)

    def __str__(self):
        # todo: make correct representation
        return '<{self.__class__.__name__}@{details}>'.format(
            self=self, details=self.uri or self._id or id(self))

    def node_hash(self):  # todo: (!) rename
        u'''uri первого попавшегося абстрактного узла в цепочке наследования включющей данный узел'''
        if self.abstract:
            return '_{}'.format(str(self.uri))
        elif self.parent:
            return self.parent.node_hash()
        raise Exception('try to get node hash in wrong node: {!r}'.format(self))  # todo: exception specify

    def node_html(self):  # todo: rename
        return self.node_hash().replace('://', '-').replace('/', '-')

    def as_client_dict(self):  # todo: rename to 'to_son_client'
        d = dict(
            id=self.id,
            node_hash=self.node_hash(),
            html_hash=self.node_html(),
        )
        for name, attr, getter in self.iter_attrs(tags='client'):
            d[name] = getter()
        return d

    def iter_attrs(self, tags=None, classes=None):
        if isinstance(tags, basestring):
            tags = set(tags.split())
        elif tags is not None:
            tags = set(tags)

        for name, attr in self._fields.items():  # todo: optimize Сделать перебор по _fields, а не всем подряд атрибутам
            if (
                (not tags or attr.tags & tags) and
                (not classes or isinstance(attr, classes))
            ):
                getter = lambda: getattr(self, name)
                yield name, attr, getter

    def instantiate(self, name=None, by_uri=None, **kw):
        assert self.abstract, "Can't instantiate abstract object: {}".format(self)
        if by_uri:
            kw.update(by_uri.params)
        inst = self.__class__(name=name, parent=self, abstract=False, **kw)
        # todo: Сделать поиск ссылок в параметрах URI
        return inst

    def deep_iter(self, reject_abstract=True):
        queue = [self]
        while queue:
            item = queue.pop()
            queue.extend(item)
            if not item.abstract or not reject_abstract:
                yield item

    def __iter__(self):
        return iter(self._subnodes)

    def __hash__(self):
        return hash(self._id)  # todo: test just created objects

    # todo: rename to "_load_node_from_fs"
    @classmethod
    def _load_node(cls, path, owner=None):
        assert isinstance(path, unicode), '{}._load_node: path is not unicode, but: {!r}'.format(cls, path)
        attrs = {}
        for f in os.listdir(path):
            assert isinstance(f, unicode), '{}._load_node: listdir returns non unicode value'.format(cls)
            # f = f.decode(sys.getfilesystemencoding())
            p = os.path.join(path, f)
            # todo: need to centralization of filtering
            if not f.startswith('_') and not f.startswith('#') and os.path.isfile(p) and fnmatch(p, '*.yaml'):
                with open(p) as attr_file:
                    try:
                        d = yaml.load(attr_file) or {}
                    except yaml.scanner.ScannerError as e:
                        raise RegistryNodeFormatError(e)
                    attrs.update(d)

        name = attrs.pop('name', os.path.basename(path.strip('\/')))  # todo: check it
        abstract = attrs.pop('abstract', True)  # todo: Вынести это умолчание на видное место
        attrs.update(
            name=name,
            owner=owner,
            abstract=abstract,
        )
        if 'parent' not in attrs:
            attrs.update(parent=owner)

        node = cls.from_son(attrs)
        if owner:
            owner._subnodes.add(node)
        return node

    @classmethod
    @return_future
    def load(cls, path, callback=None, mongo_store=True):
        def on_save(stat, saving_node):
            saving_node.save(upsert=True, callback=partial(on_load, stat))

        def on_load(*av, **kw):
            if all_nodes:
                node = all_nodes.pop()
                f = partial(on_save, saving_node=node) if mongo_store else on_load
                node.load_references(callback=f)
            else:
                _loading_duration = time.time() - _loading_start_time
                log.info('References loaded DONE ({:.0f}s)'.format(_loading_duration,))
                callback(root)
                return

        all_nodes = []
        _loading_start_time = time.time()
        root = None
        stack = deque([(path, None)])
        while stack:
            pth, owner = stack.pop()
            node = cls._load_node(pth, owner)
            if node:
                all_nodes.append(node)
                node.to_cache()
                if owner is None:
                    root = node  # todo: optimize
                for f in os.listdir(pth):
                    next_path = os.path.join(pth, f)
                    if os.path.isdir(next_path) and not f.startswith('#') and not f.startswith('_'):
                        stack.append((next_path, node))

        _loading_duration = time.time() - _loading_start_time
        log.info('Registry loading DONE: {} nodes ({:.0f}s).'.format(len(all_nodes), _loading_duration))

        _loading_start_time = time.time()
        on_load()

        #tornado.ioloop.IOLoop.instance().add_callback(callback, root)

    @return_future
    def load_references(self, fields=None, callback=None, alias=None):
        def on_load(*args):
            owner = self.owner
            if owner:
                owner._subnodes.add(self)

            callback(*args)

        # log.debug('load_references({self})'.format(self=self))
        super(Node, self).load_references(fields=fields, callback=on_load, alias=alias)

class Root(Node):
    pass
