    # -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

from motorengine.errors import LoadReferencesRequiredError
from uuid import uuid1 as get_uuid
from weakref import WeakSet

from sublayers_server.model.registry.uri import URI
from sublayers_server.model.registry.odm import AbstractDocument
from sublayers_server.model.registry.odm.fields import (
    StringField, ListField, BooleanField, UUIDField,
    UniReferenceField,
)


class StorageUnspecified(Exception):
    # todo: refactor declaration of exception
    pass


class Node(AbstractDocument):
    # todo: make sparse indexes
    # todo: override attributes in subclasses
    uid = UUIDField(default=get_uuid, unique=True)
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
        assert not owner or owner.uri
        path = (owner and owner.uri and URI(owner.uri).path or ()) + (self.name or ('+' + self.id_),)
        return URI(
            scheme='reg',
            storage=self.__class__.__collection__,
            path=path,
        )

    def to_cache(self):
        assert self.uri
        super(Node, self).to_cache(self.uri)
        owner = self.owner
        if owner:
            owner._subnodes.add(self)

    def __init__(self, storage=None, **kw):
        """
        @param str name: Name of node
        @param Node parent: Parent of node
        @param sublayers_server.model.registry.storage.AbstractStorage storage: Storage o this node
        @param Node owner: Owner of node in dhe tree
        @param bool abstract: Abstract sign of node
        """
        #_id=kw.pop('_id', ObjectId()),
        super(Node, self).__init__(storage=storage, **kw)
        if self.uri is None:
            self.uri = str(self.make_uri())

        self._subnodes = WeakSet()
        # self.storage = storage
        # if storage:
        #     storage.put(self)

    def __setattr__(self, name, value):
        if name in ['_subnodes']:
            return object.__setattr__(self, name, value)

        return super(Node, self).__setattr__(name, value)

    def __getattribute__(self, name):
        # required for the next test
        if name in ['_fields', '_subnodes']:
            return object.__getattribute__(self, name)

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
            html_hash=self.node_html(),
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

    def instantiate(self, storage=None, name=None, **kw):
        assert self.abstract
        inst = self.__class__(name=name, storage=storage, parent=self, abstract=False, **kw)
        log.debug('Maked new instance %s', inst.uri)
        return inst

    # def __getstate__(self):
    #     #do_not_store = ('storage', '_subnodes', '_cache', 'owner',)
    #     #log.debug('%s.__getstate__', self)
    #     #d = OrderedDict(sorted((kv for kv in self.__dict__.items() if kv[0] not in do_not_store)))
    #     values = self.values
    #     d = dict(
    #         name=self.name,
    #         abstract=self.abstract,
    #         parent=self.parent.uri if self.parent.storage else self.parent,
    #     )
    #     for name, attr, getter in self.iter_attrs():  # todo: migration is not complete
    #         if attr.name in values:  # todo: refactor it
    #             v = getter()
    #             if isinstance(attr, RegistryLink) and v and v.storage and v.storage.name == 'registry':  # todo: fixit
    #                 v = v.uri  # todo: (!!!)
    #             elif isinstance(attr, TagsAttribute):
    #                 v = str(v)
    #             d[attr.name] = v
    #     return d

    # def __setstate__(self, state):
    #     self._cache = {}
    #     self._subnodes = {}  # todo: проверить при переподчинении нода
    #     self._prepared_attrs = set()
    #     self.name = None
    #     self.owner = None
    #     self.values = {}
    #     self.storage = None
    #     parent = state.pop('parent')
    #     if isinstance(parent, URI):
    #         parent = parent.resolve()
    #     self.parent = parent
    #
    #     for k, v in state.items():
    #         setattr(self, k, v)

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

    # def dump(self):
    #     return yaml.dump(self, default_flow_style=False, allow_unicode=True)
