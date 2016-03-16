# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from sublayers_server.model.registry.attr import Attribute, DocAttribute
from sublayers_server.model.registry.attr.tag import TagsAttribute
from sublayers_server.model.registry.attr.link import RegistryLink
from sublayers_server.model.registry.uri import URI

import yaml


class StorageUnspecified(Exception):
    # todo: refactor declaration of exception
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


class NodeMeta(AttrUpdaterMeta):

    classes = {}

    def __init__(cls, name, bases, attrs):
        super(NodeMeta, cls).__init__(name, bases, attrs)
        cls.classes[name] = cls

    def update_attr(self, name, value):
        super(NodeMeta, self).update_attr(name, value)
        if isinstance(value, Attribute):
            value.attach(name=name, cls=self)

    def __call__(cls, *av, **kw):
        node = super(NodeMeta, cls).__call__(*av, **kw)
        node.prepare()
        return node


class Node(object):
    __metaclass__ = NodeMeta

    # todo: override attributes in subclasses
    #abstract = Attribute(default=True, caption=u'Абстракция', doc=u'Признак абстрактности узла')
    #parent = RegistryLink(caption=u'Родительский элемент', need_to_instantiate=False)
    can_instantiate = Attribute(default=True, caption=u'Инстанцируемый', doc=u'Признак возможности инстанцирования')
    doc = DocAttribute()
    tags = TagsAttribute(caption=u'Теги', tags="client")

    def __init__(self, name=None, parent=None, values=None, storage=None, owner=None, abstract=False, **kw):
        """
        @param str name: Name of node
        @param Node parent: Parent of node
        @param dict values: Override attributes values dict
        @param sublayers_server.model.registry.storage.AbstractStorage storage: Storage o this node
        @param Node owner: Owner of node in dhe tree
        """
        super(Node, self).__init__()
        self.storage = None
        self.abstract = abstract
        self._prepared_attrs = set()  # todo: optimize
        self._cache = {}
        self._subnodes = {}  # todo: проверить при переподчинении нода
        self.name = name or storage and storage.gen_uid().get_hex()
        self.owner = owner
        self.parent = parent

        self.values = values and values.copy() or {}
        for p in kw.keys():
            if not hasattr(self, p):
                log.warning("Object {!r} has no attribute like {}".format(self, p))
        self.values.update(kw)
        self.storage = storage

        if storage:
            storage.put(self)

    @property
    def id(self):
        # todo: Решить проблему изменения идентификатора при помещении в хранилище
        return self.uri and str(self.uri) or '{}#{}'.format(self.__class__.__name__, id(self))

    def node_hash(self):
        if self.uri:
            return str(self.uri)
        elif self.parent:
            return self.parent.node_hash()
        raise Exception('try to get node hash in wrong node: {!r}'.format(self))  # todo: exception specify

    def node_html(self):
        return self.node_hash().replace('://', '-').replace('/', '-')

    def as_client_dict(self):
        # return {attr.name: getter() for attr, getter in self.iter_attrs(tags='client')}
        d = dict(
            id=self.id,
            node_hash=self.node_hash(),
        )
        for attr, getter in self.iter_attrs(tags='client'):
            v = getter()
            if isinstance(attr, TagsAttribute):
                v = list(v)  # todo: Перенести это в расширение сериализатора
            d[attr.name] = v
        return d

    def prepare(self):
        for attr, getter in self.iter_attrs():
            assert isinstance(attr, Attribute)
            if attr.name not in self._prepared_attrs:
                attr.prepare(obj=self)

    def iter_attrs(self, tags=None, classes=None):
        if isinstance(tags, basestring):
            tags = set(tags.split())
        elif tags is not None:
            tags = set(tags)

        cls = self.__class__
        for k in dir(cls):
            attr = getattr(cls, k)
            """@type: Attribute"""
            if (
                isinstance(attr, Attribute)
                and (not tags or attr.tags & tags)
                and (not classes or isinstance(attr, classes))
            ):
                getter = lambda: attr.__get__(self, cls)
                yield attr, getter

    def instantiate(self, storage=None, name=None, **kw):
        assert self.abstract
        inst = self.__class__(name=name, storage=storage, parent=self, abstract=False, **kw)
        # log.debug('Maked new instance %s', inst.uri)
        return inst

    def __getstate__(self):
        #do_not_store = ('storage', '_subnodes', '_cache', 'owner',)
        #log.debug('%s.__getstate__', self)
        #d = OrderedDict(sorted((kv for kv in self.__dict__.items() if kv[0] not in do_not_store)))
        values = self.values
        d = dict(
            name=self.name,
            abstract=self.abstract,
            parent=self.parent.uri if self.parent.storage else self.parent,
        )
        for attr, getter in self.iter_attrs():
            if attr.name in values:  # todo: refactor it
                v = getter()
                if isinstance(attr, RegistryLink) and v and v.storage and v.storage.name == 'registry':  # todo: fixit
                    v = v.uri  # todo: (!!!)
                elif isinstance(attr, TagsAttribute):
                    v = str(v)
                d[attr.name] = v
        return d

    def __setstate__(self, state):
        self._cache = {}
        self._subnodes = {}  # todo: проверить при переподчинении нода
        self._prepared_attrs = set()
        self.name = None
        self.owner = None
        self.values = {}
        self.storage = None
        parent = state.pop('parent')
        if isinstance(parent, URI):
            parent = parent.resolve()
        self.parent = parent

        for k, v in state.items():
            setattr(self, k, v)

    @property
    def uri(self):
        if self.storage is None:
            return
        return self.storage.get_uri(self)

    # noinspection PyUnusedLocal
    def attach(self, name, cls):
        assert self.name is None
        self.name = name
        # todo: tags apply

    def save(self, storage=None):
        storage = storage or self.storage
        if storage is None:
            raise StorageUnspecified('Storage to save node ({!r}) is unspecified'.format(self))
        storage.save_node(node=self)

    def reset(self):
        if self.storage is None:
            raise StorageUnspecified('Storage to save node ({!r}) is unspecified'.format(self))
        self.storage.reset(node=self)

    def deep_iter(self, reject_abstract=True):
        queue = [self]
        while queue:
            item = queue.pop()
            queue.extend(item)
            if not item.abstract or not reject_abstract:
                yield item

    def __iter__(self):
        return iter(self._subnodes.values())

    def __hash__(self):
        return hash((self.storage, self.name))

    def __repr__(self):
        # todo: make correct representation
        return '<{self.__class__.__name__}@{details}>'.format(
            self=self, details=self.uri if self.storage else id(self))

    def dump(self):
        return yaml.dump(self, default_flow_style=False, allow_unicode=True)

    def resume_dict(self):
        d = dict(
            __cls__=self.__class__.__name__,
            name=self.name,
        )
        for attr, getter in self.iter_attrs():
            v = getter()
            if isinstance(attr, TagsAttribute):
                v = str(v)
            elif isinstance(v, Node):
                if v.storage and v.storage.name == 'registry':
                    v = str(v.uri)  # todo: (!!)
                else:
                    v = v.resume_dict()
            elif isinstance(v, URI):
                v = str(v)
            d[attr.name] = v
        return d

    def resume(self):
        d = self.resume_dict()
        return yaml.dump(d, default_flow_style=False, allow_unicode=True)

    def _del_attr_value(self, name):
        del(self.values[name])

    def _has_attr_value(self, name):
        return name in self.values


if __name__ == '__main__':
    #from pprint import pprint as pp
    # from pickle import dumps, loads
    # import jsonpickle as jp
    pass
