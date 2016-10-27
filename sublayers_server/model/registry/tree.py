# -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from tornado.concurrent import return_future
from motorengine.errors import LoadReferencesRequiredError
from uuid import uuid1 as get_uuid
from weakref import WeakSet
from fnmatch import fnmatch
from collections import deque, Callable
from pprint import pformat
from functools import partial
from copy import copy
import time
import yaml
import yaml.scanner
import os

from sublayers_server.model.registry.uri import URI
from sublayers_server.model.registry.odm import AbstractDocument
from sublayers_server.model.registry.odm.meta import SubclassMeta
from sublayers_server.model.registry.odm.fields import (
    StringField, BooleanField, UUIDField, UniReferenceField, EmbeddedDocumentField, ListField,
)
from sublayers_server.model.registry.odm.doc import _call_stat


class RegistryError(Exception):
    pass


class RegistryNodeFormatError(RegistryError):
    pass


class Doc(AbstractDocument):

    def _reinst_list(self, field, lst):
        lst = copy(lst)
        subfield = field._base_field
        for i, item in enumerate(lst):
            if item is not None:
                if isinstance(subfield, ListField):
                    lst[i] = self._reinst_list(subfield, copy(item))
                elif isinstance(subfield, EmbeddedDocumentField) and isinstance(item, Doc):
                    lst[i] = item.instantiate()
                else:
                    lst[i] = copy(item)
        return lst

    def _instantiaite_field(self, new_instance, field, name):
        if hasattr(field, 'reinst') and field.reinst:
            value = getattr(self, name)
            if value is not None:
                if isinstance(field, EmbeddedDocumentField):
                    assert not isinstance(value, basestring), (
                        'Embeded fields, described by string ({value!r}) is not supported yet'.format(value=value)
                    )
                    if isinstance(value, basestring):
                        value = URI(value)  # todo: handle exceptions

                    setattr(new_instance, name, value.instantiate())  # todo: Поддержка шаблонного формирования по ссылке
                elif isinstance(field, ListField):
                    setattr(new_instance, name, self._reinst_list(field, value))

    def instantiate(self, **kw):
        # todo: Сделать поиск ссылок в параметрах URI
        inst = self.__class__(**kw)

        for name, field in self._fields.items():
            self._instantiaite_field(inst, field, name)

        return inst

    def as_client_dict(self):  # todo: rename to 'to_son_client'
        d = {}
        for name, attr, getter in self.iter_attrs(tags='client'):
            d[name] = getter()
        return d

    def iter_attrs(self, tags=None, classes=None):
        if isinstance(tags, basestring):
            tags = set(tags.split())
        elif tags is not None:
            tags = set(tags)

        for name, attr in self._fields.items():  # todo: optimize Сделать перебор по _fields, а не всем подряд атрибутам
            if hasattr(attr, 'tags'):
                if (
                    (not tags or attr.tags & tags) and
                    (not classes or isinstance(attr, classes))
                ):
                    getter = lambda: getattr(self, name)
                    yield name, attr, getter


class Subdoc(Doc):
    def instantiate(self, **kw):
        # values = self._values.copy()
        values = self._values  # todo: ВОзможно нужно копировать параметры по-другому (_instantiate_field override)
        values.update(kw)
        return super(Subdoc, self).instantiate(**values)


class Subclassdoc(Subdoc):
    __metaclass__ = SubclassMeta


class Node(Doc):
    # todo: make sparse indexes
    # todo: override attributes in subclasses
    uid = UUIDField(default=get_uuid, unique=True, identify=True, tags="client")
    title = StringField(caption=u"Название", tags='client')
    fixtured = BooleanField(default=False, doc=u"Признак предопределенности объекта из файлового репозитория")
    uri = StringField(sparse=True, identify=True)
    abstract = BooleanField(default=True, doc=u"Абстракция - Признак абстрактности узла")
    parent = UniReferenceField(reference_document_type='sublayers_server.model.registry.tree.Node')
    owner = UniReferenceField(reference_document_type='sublayers_server.model.registry.tree.Node')
    can_instantiate = BooleanField(default=True, doc=u"Инстанцируемый - Признак возможности инстанцирования")
    name = StringField()
    doc = StringField()
    tags = ListField(base_field=StringField(tags="client"), caption=u"Теги", doc=u"Набор тегов объекта")

    @property
    def tag_set(self):
        tags = set(self.tags or [])
        if self.parent:
            tags.update(self.parent.tag_set)
        return tags

    def make_uri(self):
        owner = self.owner
        assert not owner or owner.uri, '{}.make_uri without owner.uri'.format(self)
        path = (owner and owner.uri and URI(owner.uri).path or ()) + (self.name or ('+' + self._id),)
        return URI(
            scheme='reg',
            #storage=self.__class__.__collection__,
            path=path,
        )

    def __init__(self, **kw):  # embedded=False,
        """
        @param str name: Name of node
        @param Node parent: Parent of node
        @param Node owner: Owner of node in dhe tree
        @param bool abstract: Abstract sign of node
        """
        #_id=kw.pop('_id', ObjectId()),
        super(Node, self).__init__(**kw)
        self._subnodes = WeakSet()  # todo: use __not_a_field__ notation to store this attribute

        if self.uri is None:
            owner = self._values.get('owner')
            if owner:  # todo: Сделать меньше вариантов назначения имени. Хочется определенности.
                self_name = self.name or self.uid or self.profile_id and 'profile={}'.format(self.profile_id)
                owner_uri = owner if isinstance(owner, basestring) else owner.uri
                owner_uri = URI(owner_uri)
                self_uri = owner_uri.replace(path=owner_uri.path + (self_name,))
                self.uri = str(self_uri)
            elif self.abstract and self.name:
                self.uri = str(URI(scheme='reg', path=(self.name,)))

    def __getitem__(self, idx):
        path = None
        # todo: test to URI
        if isinstance(idx, basestring):
            idx = idx.replace('\\', '/')
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
            is_value_exists = name in self._values
            value = field.get_value(self._values.get(name, None))

            if not is_value_exists and name not in {'parent', 'owner', 'uri', 'name'}:
                try:
                    parent = self.parent
                except Exception as e:
                    assert False, "oops! where are you, mom!? %s" % e
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
        return '<{self.__class__.__name__}[{details}]>'.format(
            self=self,
            details=(
                self.uri or
                self.parent and self.parent.uri and '{}#{}'.format(self.parent.uri, self.uid) or
                ('#' + self.uid)
            ),
        )

    def node_hash(self):  # todo: (!) rename to proto_uri
        u'''uri первого попавшегося абстрактного узла в цепочке наследования включющей данный узел'''
        if self.uri:
            return self.uri
        elif self.parent:
            return self.parent.node_hash()

        raise Exception('try to get node hash in wrong node: {!r}'.format(self))  # todo: exception specify

    def node_html(self):  # todo: rename
        return self.node_hash().replace('://', '-').replace('/', '-')

    def as_client_dict(self):  # todo: rename to 'to_son_client'
        d = super(Node, self).as_client_dict()
        d.update(
            id=self.id,
            node_hash=self.node_hash(),
            html_hash=self.node_html(),
            tags=list(self.tag_set),
        )
        return d

    # def _instantiaite_field(self, new_instance, field, name):
    #     if name == 'uid':
    #         pass
    #     else:
    #         super(Node, self)._instantiaite_field(new_instance, field, name)

    def instantiate(self, name=None, **kw):
        # assert self.abstract, "Can't instantiate abstract object: {}".format(self)
        params = {}
        if self.uri:
            parent = self
        else:
            parent = self._values.get('parent', None)
            params.update(self._values)

        fixture_default = self.__class__.fixtured.default
        fixtured = kw.pop('fixtured', fixture_default() if isinstance(fixture_default, Callable) else fixture_default)
        uid = kw.pop('uid', self.__class__.uid.default())
        params.update(kw)
        #inst = self.__class__(name=name, parent=parent, abstract=False, **params)  # todo: abstract flag FIXME
        params.update(parent=parent, name=name, uid=uid, fixtured=fixtured)

        # Инстанцирование вложенных документов
        for field_name, field in self._fields.items():
            if self.is_embedded_field(field):
                field_value = getattr(self, field_name)
                if field_value and isinstance(field_value, Node):
                    field_value = field_value.instantiate()
                    params[field_name] = field_value

        inst = super(Node, self).instantiate(**params)  # abstract=False,
        # todo: Разобраться с abstract при реинстанцированиях
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
        return hash(self.uid)  # todo: test just created objects

    # todo: rename to "_load_node_from_fs"
    @classmethod
    def _load_node(cls, path, owner=None):
        assert isinstance(path, unicode), '{}._load_node: path is not unicode, but: {!r}'.format(cls, path)
        attrs = {}
        for f in sorted(os.listdir(path)):
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
        attrs.setdefault('fixtured', True)

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

    def is_ancestor(self, parent_candidate):
        return self.get_ancestor_level(parent_candidate) >= 0

    def get_ancestor_level(self, parent_candidate):  # todo: rename to `get_ancestor_level`
        h = parent_candidate.node_hash()
        i = 0
        obj = self
        while obj and obj.node_hash() != h:
            i += 1
            obj = obj.parent

        return i if obj else -1


class Root(Node):
    pass
