    # -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)


import sys
import six
import yaml
from motorengine import (
    Document, StringField, ListField, ReferenceField,
    EmbeddedDocumentField, EmailField, BooleanField, IntField, DateTimeField,
)


class StorageUnspecified(Exception):
    # todo: refactor declaration of exception
    pass


class RefField(ReferenceField):

    def get_class(self, klass_path):
        if not klass_path:
            raise ImportError("Wrong class reference %s." % klass_path)

        klass_path_parts = klass_path.split('.')
        module_parts = klass_path_parts[:-1]
        klass_name = klass_path_parts[-1]

        if module_parts:
            module = __import__('.'.join(module_parts))
        else:
            module = sys.modules[self.__module__]

        if len(module_parts) > 1:
            for part in module_parts[1:]:
                module = getattr(module, part)
            
        try:
            return getattr(module, klass_name)
        except AttributeError:
            err = sys.exc_info()
            raise ImportError("Can't find class %s (%s)." % (klass_path, str(err)))

    @property
    def reference_type(self):
        if self._resolved_reference_type is None:
            if isinstance(self._reference_document_type, six.string_types):
                self._resolved_reference_type = self.get_class(self._reference_document_type)
            else:
                self._resolved_reference_type = self._reference_document_type

        return self._resolved_reference_type
    

class Node(Document):
    __lazy__ = True
    __field_tags__ = {
        'client': ['tags'],
    }
    # todo: override attributes in subclasses
    abstract = BooleanField(default=True)  # Абстракция - Признак абстрактности узла
    parent = RefField('Node')
    owner = RefField('Node')
    can_instantiate = BooleanField( default=True)  # Инстанцируемый - Признак возможности инстанцирования'
    name = StringField()
    doc = StringField()
    tags = ListField(StringField())  # Теги
    _subnodes = ListField(RefField('Node'))  # todo: реализовать переподчинении нода?

    def __init__(self, storage=None, **kw):
        """
        @param str name: Name of node
        @param Node parent: Parent of node
        @param sublayers_server.model.registry.storage.AbstractStorage storage: Storage o this node
        @param Node owner: Owner of node in dhe tree
        @param bool abstract: Abstract sign of node
        """
        super(Node, self).__init__(**kw)
        self.storage = storage
        if self.owner:
            self.owner._subnodes.append(self)  # todo: check it
        if storage:
            storage.put(self)

    @property
    def _field_tags(self):
        d = {}
        parent = self.parent
        if parent:
            d.update(parent._field_tags)
        d.update(self.__field_tags__)
        return d

    # @property
    # def uri(self):
    #     if self.storage is None:
    #         return
    #     return self.storage.get_uri(self)

    # @property
    # def id(self):
    #     # todo: Решить проблему изменения идентификатора при помещении в хранилище
    #     return self.uri and str(self.uri) or '{}#{}'.format(self.__class__.__name__, id(self))

    # def node_hash(self): # todo: (!) rename, make 'uri' property
    #     if self.uri:
    #         return str(self.uri)
    #     elif self.parent:
    #         return self.parent.node_hash()
    #     raise Exception('try to get node hash in wrong node: {!r}'.format(self))  # todo: exception specify

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


if __name__ == '__main__':
    sys.path.append('../../..')
    #from pprint import pprint as pp
    # from pickle import dumps, loads
    # import jsonpickle as jp
    pass
    a = Node(name='a', doc='aa')
    b = Node(name='b', parent=a, doc='bb')
