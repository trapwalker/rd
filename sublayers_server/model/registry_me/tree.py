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
    def __init__(self, document_type=None, **kwargs):
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
            return REG[value]

        return value
        #return super(RegistryLinkField, self).__get__(instance, owner)

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
    def to_python(self, value):
        if isinstance(value, basestring):
            parent = REG[value]
            node = parent.__class__(parent=parent)

            return node

        if not isinstance(value, self.document_type):
            return self.document_type._from_son(value, _auto_dereference=self._auto_dereference)
        return value


class Node(EmbeddedDocument):
    _dynamic = True
    meta = dict(
        allow_inheritance=True,
    )
    uri = StringField(unique=True, null=True, not_inherited=True)
    #owner = ReferenceField(document_type='self', not_inherited=True)  # todo: make it property
    #parent = ReferenceField(document_type='Node', not_inherited=True)
    parent = RegistryLinkField(not_inherited=True)
    owner = RegistryLinkField(not_inherited=True)
    # todo: make `owner` property

    uid = UUIDField(default=get_uuid, unique=True, not_inherited=True, tags={"client"})
    #fixtured = BooleanField(default=False, not_inherited=True, doc=u"Признак объекта из файлового репозитория реестра")
    #is_instant = BooleanField(default=False, not_inherited=True, doc=u"Признак инкапсулированной декларации объекта")
    abstract = BooleanField(default=True, not_inherited=True, doc=u"Абстракция - Признак абстрактности узла")
    title = StringField(caption=u"Название", tags={"client"})
    can_instantiate = BooleanField(default=True, doc=u"Инстанцируемый - Признак возможности инстанцирования")
    name = StringField(caption=u"Техническое имя в пространстве имён узла-контейнера (owner)", not_inherited=True)
    doc = StringField(caption=u"Описание узла реестра")
    tags = ListField(field=StringField(), not_inherited=True, caption=u"Теги", doc=u"Набор тегов объекта")

    def __init__(self, name=None, owner=None, parent=None, uri=None, **kw):
        if parent:
            if not isinstance(parent, Node):
                parent = REG[parent]

            # todo: Сделать прокси-наследование вместо копирования наследуемых атрибутов предка
            _ingeritable = set(self._get_inheritable_field_names())
            d = {k: v for k, v in parent._data.items() if k in _ingeritable}
            d.update(kw)
            kw = d

        if owner:
            if not isinstance(owner, Node):
                owner = REG[owner]

        if uri is None and name is not None:
            owner_uri = owner and owner.uri and URI(owner.uri) or URI('reg://')
            uri = owner_uri.replace(path=owner_uri.path + (name,)).to_string()

        super(Node, self).__init__(name=name, owner=owner, parent=parent, uri=uri, **kw)

    # def make_uri(self):
    #     owner = self.owner
    #
    #     if owner and owner.uri:
    #         base_uri = URI(owner.uri)
    #     else:
    #         base_uri = URI(scheme='reg', storage='', path=())
    #
    #     uri = base_uri.replace(path=base_uri.path + (self.name or str(self.uid),))
    #     return str(uri)

    @classmethod
    def _get_inheritable_field_names(cls):
        return [name for name, field in cls._fields.iteritems() if not getattr(field, 'not_inherited', False)]

    def to_string(self, indent=0, indent_size=4, keys_alignment=True):
        d = self.to_mongo()
        keys_width = max(map(len, d.keys())) if d and keys_alignment else 1

        def prepare_value(value):
            if isinstance(value, Node):
                value = value.to_string(
                    indent=indent + 1,
                    indent_size=indent_size,
                    keys_alignment=keys_alignment,
                )
            else:
                value = repr(value)

            if isinstance(value, basestring) and '\n' in value:
                value = (u'\n' + u' ' * (indent + 2) * indent_size).join(value.split('\n'))

            return value

        return '{self.__class__.__name__}(\n{params})'.format(
            self=self,
            params=''.join([
                '\t{k:{w}}{eq_space}={eq_space}{v},\n'.format(
                    k=k,
                    v=prepare_value(v),
                    w=keys_width,
                    eq_space=' ' if keys_width > 1 else '',
                )
                for k, v in sorted(d.items())
            ]),
        )

    def __repr__(self):
        return self.to_string()

    __str__ = __repr__

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
        d = {}
        for name, attr, getter in self.iter_attrs(tags='client'):
            value = getter()
            if isinstance(value, Node):
                value = value.as_client_dict()
            d[name] = value

        d.update(
            #node_hash=self.node_hash(),  # todo: REALIZE and uncomment this
            #html_hash=self.node_html(),
            tags=list(self.tag_set),
        )
        return d


class Registry(Document):
    tree = MapField(field=EmbeddedDocumentField(document_type=Node))

    # def __init__(self, **kw):
    #     super(Registry, self).__init__(**kw)

    def _put(self, node, uri=None):
        uri = uri or node.uri
        added_node = self.tree.setdefault(uri, node)
        assert added_node is node, (
            'Registry already has same node: {added_node!r} by uri {uri!r}. Fail to put: {node!r}'.format(
                **locals())
        )

    def get(self, uri, default=None):
        # tod4o: support alternative path notations (list, relative, parametrized)
        return self.tree.get(uri, default)

    def __getitem__(self, uri):
        # tod4o: support alternative path notations (list, relative, parametrized)
        return self.tree[uri]

    def load(self, path, mongo_store=True):
        count = 0
        stack = deque([(path, None)])
        with Timer(name='registryFS loader', logger=log) as timer:
            while stack:
                pth, owner = stack.pop()
                node = self._load_node_from_fs(pth, owner)
                if node:
                    count += 1
                    for f in os.listdir(pth):
                        next_path = os.path.join(pth, f)
                        if os.path.isdir(next_path) and not f.startswith('#') and not f.startswith('_'):
                            stack.append((next_path, node))

            # todo: resolve EmbeddedNodeField's
            for node in self.tree.values():
                for field_name, field in node._fields.items():
                    if isinstance(field, EmbeddedNodeField):
                        value = node._data.get(field_name, None)
                        if value and not isinstance(value, Node):
                            node._data[field_name] = field.to_python(value)


        log.info('Registry loading DONE: {} nodes ({:.3f}s).'.format(count, timer.duration))

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
        self._put(node)
        return node

REG = Registry()


###############################################################################################

class A(Node):
    x = IntField(null=True)
    y = IntField(null=True)
    z = IntField(null=True)
    e = EmbeddedNodeField(document_type=Node)
    #k = RegistryLinkField


class A2(A):
    w = StringField(null=True, tags='q w e')


class B(Node):
    a = IntField(null=True)
    b = IntField(null=True)


def test1():
    a   = A(name='a'   , x= 3, y= 7, e=None, )
    aa  = A(name='aa'  , x=31, y=71, e=None, owner=a.uri, )
    aaa = A(name='aaa' , x=31,       e=None, owner=aa.uri, parent=aa,)
    ab  = A(name='ab'  , x=31, y=71, e='reg:///a/aa', owner=a.uri, )

    # aa.e = ab.uri

    print(aa.owner)

    globals().update(locals())


def test2():
    REG.load(u'../../../tmp/reg')
    globals().update(locals())


if __name__ == '__main__':
    from pprint import pprint as pp
    db = connect(db='test_me')
    log.info('Use `test_me` db')

    #test1()
    test2()
