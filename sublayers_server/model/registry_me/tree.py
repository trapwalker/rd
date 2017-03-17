# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function
import os
import sys
import logging
log = logging.getLogger(__name__)

if __name__ == '__main__':
    log = logging.getLogger()
    sys.path.append('../../..')
    log.level = logging.DEBUG
    log.addHandler(logging.StreamHandler(sys.stderr))


from sublayers_common.ctx_timer import Timer
from sublayers_server.model.registry_me.uri import URI

import six
import yaml
from uuid import uuid1 as get_uuid
from collections import deque
from fnmatch import fnmatch

from mongoengine import connect, Document, EmbeddedDocument
from mongoengine.base import get_document
from mongoengine.base.metaclasses import DocumentMetaclass
from mongoengine.fields import (
    IntField, StringField, UUIDField, ReferenceField, BooleanField,
    ListField, DictField, EmbeddedDocumentField,
    GenericReferenceField, BaseField, MapField,
    RECURSIVE_REFERENCE_CONSTANT,
)


class RegistryError(Exception):
    pass


class RegistryNodeFormatError(RegistryError):
    pass


class RegistryLinkField(BaseField):
    def __init__(self, document_type='Node', **kwargs):
        super(RegistryLinkField, self).__init__(**kwargs)
        self.document_type_obj = document_type

    @property
    def document_type(self):
        if isinstance(self.document_type_obj, six.string_types):
            if self.document_type_obj == RECURSIVE_REFERENCE_CONSTANT:
                self.document_type_obj = self.owner_document
            else:
                self.document_type_obj = get_document(self.document_type_obj)
        return self.document_type_obj

    def __get__(self, instance, owner):
        """Descriptor to allow lazy dereferencing."""
        if instance is None:  # Document class being used rather than a document object
            return self

        # Get value from document instance if available
        value = instance._data.get(self.name)
        if isinstance(value, six.string_types):
            reg = instance.__get_registry__()
            node = reg.get(value)
            instance._data[value] = node  # Caching
            return node

        return value
        #return super(RegistryLinkField, self).__get__(instance, owner)

    def __set__(self, instance, value):
        if value is None:
            if self.null:
                value = None
            elif self.default is not None:
                value = self.default
                if callable(value):
                    value = value()

        if instance._initialised:
            try:
                if (self.name not in instance._data or
                        instance._data[self.name] != value):
                    instance._mark_as_changed(self.name)
            except Exception:
                # Values cant be compared eg: naive and tz datetimes
                # So mark it as changed
                instance._mark_as_changed(self.name)

        instance._data[self.name] = value

    def to_mongo(self, document):
        if document is None:
            return

        elif isinstance(document, basestring):
            # todo: normalize URI
            return document

        elif isinstance(document, Node):
            assert document.uri, 'Registry node do not has URI to link them: {!r}'.format(document)
            return document.uri

        else:
            raise TypeError('Linked node type is not supported: {!r}'.format(document))

    # def to_python(self, value):
    #     """Convert a MongoDB-compatible type to a Python type."""
    #     # todo: realization
    #     return value

    def prepare_query_value(self, op, value):
        if value is None:
            return None
        super(RegistryLinkField, self).prepare_query_value(op, value)
        return self.to_mongo(value)

    def validate(self, value, **kw):

        if isinstance(value, basestring):
            # todo: validate registry URI
            pass

        elif not isinstance(value, self.document_type):
            self.error('A RegistryLinkField only accepts URI or Node ({})'.format(self.document_type))

        if isinstance(value, Node) and value.uri is None:
            self.error('You can only reference nodes once they has an URI')

    def lookup_member(self, member_name):
        return self.document_type._fields.get(member_name)


class EmbeddedNodeField(EmbeddedDocumentField):

    def __init__(self, document_type='Node', **kwargs):
        super(EmbeddedNodeField, self).__init__(document_type, **kwargs)

    def __set__(self, instance, value):
        if instance._initialised:
            if isinstance(value, basestring):
                reg = instance.__get_registry__()  # todo: Избавиться от глобального объекта
                parent = reg.get_node_by_uri(value)
                if parent:
                    value = parent.__class__(parent=parent)
                else:
                    assert not instance._initialised

            # todo: Проверить поддержку инициализации нода из словаря
            if value and not isinstance(value, Node) and not (isinstance(value, basestring) and not instance._initialised):
                value = self.to_python(value)
        super(EmbeddedNodeField, self).__set__(instance, value)


class NodeMetaclass(DocumentMetaclass):
    def __new__(cls, name, bases, attrs):
        super_new = super(NodeMetaclass, cls).__new__
        new_cls = super_new(cls, name, bases, attrs)

        # Fields processing
        new_cls._inheritable_fields = set()
        new_cls._non_inheritable_fields = set()
        new_cls._deferred_init_fields = set()

        for name, field in new_cls._fields.iteritems():
            # Fields inheritance indexing
            not_inherited = getattr(field, 'not_inherited', False)
            if not_inherited:
                new_cls._non_inheritable_fields.add(name)
            else:
                new_cls._inheritable_fields.add(name)

            if isinstance(field, EmbeddedNodeField):
                new_cls._deferred_init_fields.add(name)

            # Field tags normalization
            tags = getattr(field, 'tags', None)
            if tags is not None and not isinstance(tags, set):
                if isinstance(tags, basestring):
                    tags = set(tags.split())
                else:
                    tags = set(tags)
                field.tags = tags

        return new_cls


class Subdoc(EmbeddedDocument):
    __metaclass__ = NodeMetaclass
    _dynamic = True
    meta = dict(
        allow_inheritance=True,
    )

    def as_client_dict(self):  # todo: rename to 'to_son_client'
        d = {}
        for name, attr, getter in self.iter_attrs(tags='client'):
            value = getter()
            if hasattr(value, 'as_client_dict'):
                value = value.as_client_dict()
            d[name] = value

        return d


########################################################################################################################
class Node(Subdoc):
    #__slots__ = ('_uri',)
    #__metaclass__ = NodeMetaclass
    _dynamic = True
    meta = dict(
        allow_inheritance=True,
    )

    @property
    def uri(self):
        # todo: cache it
        # if hasattr(self, '_uri'):
        #     return self._uri
        uri = None
        name = self.name
        if name is not None:
            owner = self.owner
            if isinstance(owner, Node):
                owner_uri = owner.uri
                owner_uri = owner_uri and URI(owner_uri)
            elif isinstance(owner, URI):
                owner_uri = owner
            elif owner is None:
                owner_uri = URI('reg://')
            else:
                raise AssertionError('Owner is wrong type: {!r}'.format(owner))

            uri = owner_uri.replace(path=owner_uri.path + (name,)).to_string()
        # self._uri = uri
        return uri

    def node_hash(self):  # todo: (!) rename to proto_uri
        #u'''uri первого попавшегося абстрактного узла в цепочке наследования включющей данный узел'''
        uri = self.uri
        if uri:
            return uri

        parent = self.parent
        assert parent, 'Try to get a node hash of wrong node: {!r}'.format(self)
        return self.parent.node_hash()

    def node_html(self):  # todo: rename
        return self.node_hash().replace('://', '-').replace('/', '-')

    def root_instance(self):
        # todo: cache it
        last_instance = self
        instance = self
        while instance:
            last_instance = instance
            instance = getattr(instance, '_instance', None)

        return last_instance

    def __get_registry__(self):
        # todo: cache it
        root = self.root_instance()
        reg_getter = getattr(root, '__get_registry__')
        if reg_getter is None:
            raise ValueError('Root instance {!r} has not registry getter'.format(self))

        return reg_getter()

    name = StringField(caption=u"Техническое имя в пространстве имён узла-контейнера (owner)", not_inherited=True)
    parent = RegistryLinkField(document_type='self', not_inherited=True)
    owner = RegistryLinkField(document_type='self', not_inherited=True)
    uid = UUIDField(default=get_uuid, unique=True, not_inherited=True, tags={"client"})
    #fixtured = BooleanField(default=False, not_inherited=True, doc=u"Признак объекта из файлового репозитория реестра")
    #is_instant = BooleanField(default=False, not_inherited=True, doc=u"Признак инкапсулированной декларации объекта")
    abstract = BooleanField(default=True, not_inherited=True, doc=u"Абстракция - Признак абстрактности узла")
    title = StringField(caption=u"Название", tags={"client"})
    can_instantiate = BooleanField(default=True, doc=u"Инстанцируемый - Признак возможности инстанцирования")
    doc = StringField(caption=u"Описание узла реестра")
    tags = ListField(field=StringField(), not_inherited=True, caption=u"Теги", doc=u"Набор тегов объекта")

    #uri = StringField(unique=True, null=True, not_inherited=True)
    subnodes = ListField(field=EmbeddedNodeField(not_inherited=True), not_inherited=True)
    # todo: make `owner` property

    def get(self, addr, *defaults):
        if len(defaults) > 1:
            raise TypeError('get expected at most 3 arguments, got {}'.format(2 + len(defaults)))

        path = addr2path(addr)
        if not path:
            return self

        key, rest = path[0], path[1:]
        for subnode in self.subnodes or []:  # todo: full search ##optimize
            if subnode.name == key:
                return subnode.get(rest, *defaults)

        if defaults:
            return defaults[0]

        raise KeyError('Node {!r} has no subnode {}'.format(self, path))

    def __init__(self, **kw):
        cls = self.__class__
        only_fields = kw.pop('__only_fields', cls._inheritable_fields | cls._deferred_init_fields)
        super(Node, self).__init__(__only_fields=only_fields, **kw)
        print(kw.get('name'), kw.get('parent'))

    def __getattribute__(self, item):
        if item not in {
            '_fields', 'parent',
            '_dynamic', '_dynamic_lock', '_is_document', '__class__', 'STRICT',
            # BaseDocument.__slots__
            '_changed_fields', '_initialised', '_created', '_data',
            '_dynamic_fields', '_auto_id_field', '_db_field_map',
            '__weakref__',
            # EmbeddedDocument.__slots__
            '_instance',
        }:
            if self._initialised:
                field = self._fields.get(item, None)
                if field and not getattr(field, 'not_inherited', False) and item not in self._data:
                    parent = self.parent
                    default = field.default
                    return parent and getattr(parent, item, default() if callable(default) else default)

        return super(Node, self).__getattribute__(item)

    def to_string(self, indent=0, indent_size=4, keys_alignment=True):
        d = self.to_mongo()
        keys_width = max(map(len, d.keys())) if d and keys_alignment and indent_size else 1

        def prepare_value(value):
            if isinstance(value, Node):
                value = value.to_string(
                    indent=indent + 1 if indent_size else indent,
                    indent_size=indent_size,
                    keys_alignment=keys_alignment,
                )
            else:
                value = repr(value)

            if isinstance(value, basestring) and '\n' in value and (indent_size or indent):
                value = (u'\n' + u' ' * (indent + 2) * indent_size).join(value.split('\n'))

            return value

        return '{self.__class__.__name__}({nl}{params})'.format(
            self=self,
            nl='\n' if indent_size else '',
            params=('' if indent_size else ' ').join([
                '{tab}{k:{w}}{eq_space}={eq_space}{v},{nl}'.format(
                    k=k,
                    v=prepare_value(v),
                    w=keys_width,
                    eq_space=' ' if keys_width > 1 else '',
                    tab='\t' if indent_size else '',  # todo: replace '\t' to ' '*indent_size
                    nl='\n' if indent_size else '',
                )
                for k, v in sorted(d.items())
            ]),
        )

    def __repr__(self):
        return self.to_string(indent_size=0)

    def __str__(self):
        return self.to_string()

    @property
    def tag_set(self):
        tags = set(self.tags or [])
        if self.parent:
            tags.update(self.parent.tag_set)
        return tags

    def iter_attrs(self, tags=None, classes=None):
        if isinstance(tags, basestring):
            tags = set(tags.split())
        elif tags is not None:
            tags = set(tags)

        for name, attr in self._fields.items():
            field_tags = getattr(attr, 'tags', None)
            if (
                (tags is None or field_tags is not None and field_tags & tags) and
                (classes is None or isinstance(attr, classes))
            ):
                getter = lambda: getattr(self, name)
                yield name, attr, getter

    def as_client_dict(self):  # todo: rename to 'to_son_client'
        d = super(Node, self).as_client_dict()
        d.update(
            node_hash=self.node_hash(),  # todo: REALIZE and uncomment this
            html_hash=self.node_html(),
            tags=list(self.tag_set),
        )
        return d

    def is_ancestor(self, parent_candidate):
        return self.get_ancestor_level(parent_candidate) >= 0

    def get_ancestor_level(self, parent_candidate):
        h = parent_candidate.node_hash()
        i = 0
        obj = self
        while obj and obj.node_hash() != h:
            i += 1
            obj = obj.parent

        return i if obj else -1


########################################################################################################################

def addr2path(addr):
    if isinstance(addr, tuple):
        return addr

    if isinstance(addr, basestring):
        if addr.startswith('reg://') or addr.startswith('/'):
            uri = URI(addr)
            assert not uri.params and not uri.anchor, 'Wrong node address to get: {!r}'.format(addr)
            return uri.path
        else:
            return tuple(addr.split('/'))

    return tuple(addr)


class Doc(Document):
    meta = dict(
        allow_inheritance=True,
    )
    def __get_registry__(self):
        return get_global_registry()


class Registry(Doc):
    name = StringField()
    root = EmbeddedNodeField()

    # def __init__(self, **kw):
    #     super(Registry, self).__init__(**kw)

    # todo: del mentions "_put"

    def __get_registry__(self):
        return self

    def get(self, uri, *defaults):
        path = addr2path(uri)
        if not path:
            return self.root

        root_name, rest_path = path[0], path[1:]
        if self.root.name == root_name:
            return self.root.get(rest_path, *defaults)

        if defaults:
            return defaults[0]

        raise KeyError('Registry has no root named {!r}'.format(self, root_name))

    get_node_by_uri = get  # todo: remove deprecated

    def load(self, path, mongo_store=True):
        all_nodes = []
        stack = deque([(path, None)])
        with Timer(name='registryFS loader', logger=log) as timer:
            while stack:
                pth, owner = stack.pop()
                node = self._load_node_from_fs(pth, owner)
                if node:
                    if owner is None:
                        self.root = node
                        log.debug('Setup root: {!r}'.format(node))
                    all_nodes.append(node)
                    for f in os.listdir(pth):
                        next_path = os.path.join(pth, f)
                        if os.path.isdir(next_path) and not f.startswith('#') and not f.startswith('_'):
                            stack.append((next_path, node))

            for node in all_nodes:
                for field_name, field in node._fields.items():
                    if isinstance(field, EmbeddedNodeField):
                        value = node._data.get(field_name, None)
                        if value and not isinstance(value, Node):
                            setattr(node, field_name, value)

        log.info('Registry loading DONE: {} nodes ({:.3f}s).'.format(len(all_nodes), timer.duration))

    def _load_node_from_fs(self, path, owner=None):
        assert isinstance(path, unicode), '_load_node_from_fs: path is not unicode, but: {!r}'.format(path)
        attrs = {}
        for f in sorted(os.listdir(path)):
            assert isinstance(f, unicode), 'listdir returns non unicode value: {!r}'.format(f)
            # f = f.decode(sys.getfilesystemencoding())
            p = os.path.join(path, f)
            # todo: need to centralization of filtering
            if not f.startswith('_') and not f.startswith('#') and os.path.isfile(p) and fnmatch(p, '*.yaml'):
                with open(p) as attr_file:
                    try:
                        d = yaml.load(attr_file) or {}
                    except yaml.YAMLError as e:
                        raise RegistryNodeFormatError(e)
                    assert isinstance(d, dict), 'Yaml content is not object, but: {!r}'.format(d)
                    attrs.update(d.items())

        attrs.update(owner=owner)
        attrs.setdefault('name', os.path.basename(path.strip('\/')))
        attrs.setdefault('parent', owner)
        attrs.setdefault('abstract', True)  # todo: Вынести это умолчание на видное место
        #attrs.setdefault('fixtured', True)
        parent = attrs.get('parent', None)
        if parent:
            attrs.setdefault('_cls', parent._cls)

        class_name = attrs.get('_cls', Node._class_name)
        cls = get_document(class_name)

        node = cls(__auto_convert=False, _created=False, **attrs)
        if owner:
            if isinstance(owner, Node):
                owner.subnodes.append(node)
            # todo: assert: owner is document
            node._instance = owner
        return node


REGISTRY = None

def get_global_registry(reload=True):
    global REGISTRY
    if REGISTRY is None:
        REGISTRY = Registry.objects.first()
        if REGISTRY is None or reload:
            REGISTRY = Registry()
            reload = True

        if reload:
            Registry.objects.filter({}).delete()
            REGISTRY.load(u'../../../tmp/reg')

    return REGISTRY
########################################################################################################################
########################################################################################################################

class A(Node):
    x = IntField(null=True, tags='client t1 t2')
    y = IntField(null=True, tags={'t1', 't0'})
    z = IntField(null=True, tags=['t2', 't3'])
    e = EmbeddedNodeField(tags='t0')
    #k = RegistryLinkField


class A2(A):
    w = StringField(null=True, tags='q w e')


class B(Node):
    a = IntField(null=True)
    b = IntField(null=True)


def test1():
    Registry.objects.filter({}).delete()
    reg = Registry()
    reg.root = Node(name='reg')
    a   = A(name='a'   , x= 3, y= 7, e=None, owner=reg.root)
    aa  = A(name='aa'  , x=31, y=71, e=None, owner=a.uri, )
    aaa = A(name='aaa' , x=31,       e=None, owner=aa.uri, parent=aa,)
    ab  = A(name='ab'  , x=31, y=71, e='reg:///a/aa', owner=a.uri, )

    # aa.e = ab.uri

    print(aa.owner)

    globals().update(locals())


def test2():
    reg = get_global_registry()
    a = reg.get('/reg/a')
    aa = reg.get('/reg/a/aa')
    ab = reg.get('/reg/a/ab')
    ac = reg.get('/reg/a/ac')
    print(a.y)
    print(aa.y)
    reg.save()
    globals().update(locals())


def test3():
    #REG.load(u'../../../tmp/reg')
    reg = Registry.objects.first()
    aa = reg.root.get('a/aa')
    ac = reg.root.get('a/ac')
    print(ac.parent)
    globals().update(locals())


if __name__ == '__main__':
    from pprint import pprint as pp
    db = connect(db='test_me')
    log.info('Use `test_me` db')

    #test1()
    test2()
    #test3()

    # todo: Сделать юнит-тестирование системы реестров (загрузка, сохранение, восстановление)
    # todo: Сделать прокси-наследование вместо копирования наследуемых атрибутов предка
    # todo: Проверить кэширование RegistryLinkField
    # todo: Реализовать кэширование унаследованных атрибутов
    #       - кэшировать в отдельном несериализуемом словаре
    #       - проверить возможность перекрытия __getattribute__ на уровне узла вместо подмешивания ко всем типам полей
    # todo: Реализовать кэширование root_instance