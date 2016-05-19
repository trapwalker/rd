    # -*- coding: utf-8 -*-
from __future__ import absolute_import

import logging
log = logging.getLogger(__name__)

import six
import yaml
from motorengine.errors import InvalidDocumentError, LoadReferencesRequiredError
from motorengine import (
    Document, StringField, ListField, BooleanField, UUIDField, ReferenceField,
    EmbeddedDocumentField, EmailField, IntField, DateTimeField,
)

from uuid import uuid1 as get_uuid, UUID


class StorageUnspecified(Exception):
    # todo: refactor declaration of exception
    pass


class Node(Document):
    __lazy__ = True
    __field_tags__ = {
        'client': ['tags'],
    }
    # todo: override attributes in subclasses
    uid = UUIDField(default=get_uuid)
    abstract = BooleanField(default=True)  # Абстракция - Признак абстрактности узла
    parent = ReferenceField('sublayers_server.model.registry.tree.Node')
    owner = ReferenceField('sublayers_server.model.registry.tree.Node')
    can_instantiate = BooleanField(default=True)  # Инстанцируемый - Признак возможности инстанцирования'
    name = StringField()
    doc = StringField()
    tags = ListField(StringField())  # Теги
    _subnodes = ListField(ReferenceField('sublayers_server.model.registry.tree.Node'))  # todo: реализовать переподчинении нода?

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
    
        if self.owner:
            self.owner._subnodes.append(self)  # todo: check it
    
        self.storage = storage
        if storage:
            storage.put(self)

    def find_reference_field(self, document, results, field_name, field):
        if self.is_reference_field(field):
            value = document._values.get(field_name, None)

            # todo: fix test value to URI format
            if isinstance(value, six.string_types) and value.startswith('reg://'):
                results.append([
                    field.reference_type.get_by_uri,
                    value,
                    document._values,
                    field_name,
                    None
                ])
            elif value is not None:
                results.append([
                    field.reference_type.objects.get,
                    value,
                    document._values,
                    field_name,
                    None
                ])

    def __repr__(self):
        return '{self.__class__.__name__}(\n{params})'.format(
            self=self,
            params=''.join(['\t{}={!r},\n'.format(k, v) for k, v in sorted(self.to_son().items() + [('_id', self._id)])]),
        )

    @classmethod
    def get_by_uri(cls, uri, callback):
        # todo: test uri to string and URI
        pass

    def validate_fields(self):
        for name, field in self._fields.items():
            value = self.get_field_value(name)
            parent = self.parent
            if field.required and field.is_empty(value) and (not parent or not hasattr(parent, name)):
                raise InvalidDocumentError("Field '%s' is required." % name)
            if not field.validate(value):
                raise InvalidDocumentError("Field '%s' must be valid." % name)

        return True

    @property
    def _field_tags(self):
        d = {}
        parent = self.parent
        if parent:
            d.update(parent._field_tags)
        d.update(self.__field_tags__)
        return d

    def __getattribute__(self, name):
        # required for the next test
        if name in ['_fields']:
            return object.__getattribute__(self, name)

        if name in self._fields:
            field = self._fields[name]
            is_reference_field = self.is_reference_field(field)
            if name in self._values:
                value = field.get_value(self._values[name])
            elif name == 'parent':
                return None
            else:
                parent = self.parent
                if field.required and (not parent or not hasattr(parent, name)):
                    log.warning('Required value %s is not defined in property owner class %s', name, self.__class__)
                value = getattr(parent, name, None)  # todo: may be exception need?

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

    @property
    def uri(self):
        if self.storage is None:
            return
        return self.storage.get_uri(self)

    def node_hash(self): # todo: (!) rename, make 'uri' property
        if self.uri:
            return str(self.uri)
        elif self.parent:
            return self.parent.node_hash()
        raise Exception('try to get node hash in wrong node: {!r}'.format(self))  # todo: exception specify

    # def node_html(self):
    #     return self.node_hash().replace('://', '-').replace('/', '-')

    # def as_client_dict(self):  # todo: rename to 'to_son_client'
    #     # return {attr.name: getter() for attr, getter in self.iter_attrs(tags='client')}
    #     d = dict(
    #         id=self.id,
    #         node_hash=self.node_hash(),
    #     )
    #     for attr, getter in self.iter_attrs(tags='client'):
    #         v = getter()
    #         if isinstance(attr, TagsAttribute):
    #             v = list(v)  # todo: Перенести это в расширение сериализатора
    #         d[attr.name] = v
    #     return d

    # def prepare(self):
    #     for attr, getter in self.iter_attrs():
    #         assert isinstance(attr, Attribute)
    #         if attr.name not in self._prepared_attrs:
    #             attr.prepare(obj=self)

    # def iter_attrs(self, tags=None, classes=None):
    #     if isinstance(tags, basestring):
    #         tags = set(tags.split())
    #     elif tags is not None:
    #         tags = set(tags)
    #
    #     cls = self.__class__
    #     for k in dir(cls):
    #         attr = getattr(cls, k)
    #         """@type: Attribute"""
    #         if (
    #             isinstance(attr, Attribute)
    #             and (not tags or attr.tags & tags)
    #             and (not classes or isinstance(attr, classes))
    #         ):
    #             getter = lambda: attr.__get__(self, cls)
    #             yield attr, getter

    # def instantiate(self, storage=None, name=None, **kw):
    #     assert self.abstract
    #     inst = self.__class__(name=name, storage=storage, parent=self, abstract=False, **kw)
    #     # log.debug('Maked new instance %s', inst.uri)
    #     return inst

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
    #     for attr, getter in self.iter_attrs():
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

    # noinspection PyUnusedLocal
    # def attach(self, name, cls):
    #     assert self.name is None
    #     self.name = name
    #     # todo: tags apply

    # def save(self, storage=None):
    #     storage = storage or self.storage
    #     if storage is None:
    #         raise StorageUnspecified('Storage to save node ({!r}) is unspecified'.format(self))
    #     storage.save_node(node=self)

    # def reset(self):
    #     if self.storage is None:
    #         raise StorageUnspecified('Storage to save node ({!r}) is unspecified'.format(self))
    #     self.storage.reset(node=self)

    # def deep_iter(self, reject_abstract=True):
    #     queue = [self]
    #     while queue:
    #         item = queue.pop()
    #         queue.extend(item)
    #         if not item.abstract or not reject_abstract:
    #             yield item

    def __iter__(self):
        return iter(self._subnodes)

    # def __hash__(self):
    #     return hash((self.storage, self.name))

    # def __repr__(self):
    #     # todo: make correct representation
    #     return '<{self.__class__.__name__}@{details}>'.format(
    #         self=self, details=self.uri if self.storage else id(self))

    def dump(self):
        return yaml.dump(self, default_flow_style=False, allow_unicode=True)

    # def resume_dict(self):
    #     d = dict(
    #         __cls__=self.__class__.__name__,
    #         name=self.name,
    #     )
    #     for attr, getter in self.iter_attrs():
    #         v = getter()
    #         if isinstance(attr, TagsAttribute):
    #             v = str(v)
    #         elif isinstance(v, Node):
    #             if v.storage and v.storage.name == 'registry':
    #                 v = str(v.uri)  # todo: (!!)
    #             else:
    #                 v = v.resume_dict()
    #         elif isinstance(v, URI):
    #             v = str(v)
    #         d[attr.name] = v
    #     return d

    # def resume(self):
    #     d = self.resume_dict()
    #     return yaml.dump(d, default_flow_style=False, allow_unicode=True)

    # def _del_attr_value(self, name):
    #     del(self.values[name])

    # def _has_attr_value(self, name):
    #     return name in self.values
