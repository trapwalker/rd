# -*- coding: utf-8 -*-

import logging
log = logging.getLogger(__name__)

from attr import Attribute, DocAttribute, RegistryLink

from collections import OrderedDict
import yaml
import yaml.scanner  # todo: extract serialization layer


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


class Persistent(object):
    __metaclass__ = PersistentMeta


class Node(Persistent):
    # todo: override attributes in subclasses
    abstract = Attribute(default=True, caption=u'Абстракция', doc=u'Признак абстрактности узла')
    can_instantiate = Attribute(default=True, caption=u'Инстанцируемый', doc=u'Признак возможности инстанцирования')
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
        self._subnodes = {}  # todo: проверить при переподчинении нода
        self.name = name
        self.parent = parent  # todo: parent must be an Attribute (?)
        self.owner = owner
        self.values = values or {}
        self.values.update(kw)
        self.storage = storage
        if storage:
            storage.put(self)

    def iter_attrs(self, tags=None, classes=None):
        if isinstance(tags, basestring):
            tags = set(tags.split())
        elif tags is not None:
            tags = set(tags)

        cls = self.__class__
        for k in dir(cls):
            attr = getattr(cls, k)
            if (
                isinstance(attr, Attribute)
                and (not tags or attr.tags & tags)
                and (not classes or isinstance(attr, classes))
            ):
                getter = lambda: attr.__get__(self, cls)
                yield attr, getter

    def instantiate(self, storage=None, name=None, **kw):
        # todo: test to abstract sign
        # todo: clear abstract sign
        if storage:
            name = name or storage.gen_uid().get_hex()
        inst = self.__class__(name=name, storage=storage, parent=self, **kw)
        log.debug('Maked new instance %s', inst.uri)

        for attr, getter in self.iter_attrs(classes=RegistryLink):
            if attr.need_to_instantiate:
                link = attr.get_raw(self)
                # todo: Отловить и обработать исключения
                if link:
                    uri = dict(zip('proto storage path params'.split(), self.storage.parse_uri(link)))
                    v = getter()
                    if v and v.can_instantiate:
                        new_v = v.instantiate(storage=storage, owner=self, **uri['params'])
                        setattr(inst, attr.name, new_v)
                        # todo: тест на негомогенных владельцев

        return inst

    def __getstate__(self):
        do_not_store = ('storage', '_subnodes',)
        log.debug('%s.__getstate__', self)
        d = OrderedDict(sorted((kv for kv in self.__dict__.items() if kv[0] not in do_not_store)))
        return d

    @property
    def path(self):
        if self.storage is None:
            return
        return self.storage.get_path(self)

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

    def __iter__(self):
        return iter(self._subnodes.values())

    def __hash__(self):
        return hash((self.storage, self.name))

    def __repr__(self):
        # todo: make correct representation
        return '<{self.__class__.__name__}@{details}>'.format(
            self=self, details=self.uri if self.storage else id(self))

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


if __name__ == '__main__':
    #from pprint import pprint as pp
    # from pickle import dumps, loads
    # import jsonpickle as jp
    pass
