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

import six
from uuid import uuid1 as get_uuid
from collections import deque

from mongoengine import connect, Document, EmbeddedDocument
from mongoengine.base import get_document
from mongoengine.fields import (
    IntField, StringField, UUIDField, ReferenceField, BooleanField,
    ListField, DictField, EmbeddedDocumentField,
    GenericReferenceField, BaseField, MapField,
    RECURSIVE_REFERENCE_CONSTANT,
)


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


class Node(EmbeddedDocument):
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

    def __init__(self, name=None, owner=None, parent=None, uri=None, __autoregister=True, **kw):
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
            uri = '/'.join((owner and owner.uri and [owner.uri] or []) + [name])

        super(Node, self).__init__(name=name, owner=owner, parent=parent, uri=uri, **kw)

        if uri and __autoregister:
            REG._put(self)

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

    @classmethod
    def load(cls, path, mongo_store=True):
        all_nodes = []
        root = None
        stack = deque([(path, None)])
        with Timer(name='registryFS loader', logger=log) as timer:
            while stack:
                pth, owner = stack.pop()
                node = cls._load_node_from_fs(pth, owner)
                if node:
                    node.save()

                    all_nodes.append(node)
                    # node.to_cache()  # TODO: cache objects
                    if owner is None:
                        root = node  # todo: optimize
                    for f in os.listdir(pth):
                        next_path = os.path.join(pth, f)
                        if os.path.isdir(next_path) and not f.startswith('#') and not f.startswith('_'):
                            stack.append((next_path, node))

        log.info('Registry loading DONE: {} nodes ({:.3f}s).'.format(len(all_nodes), timer.duration))
        return root

REG = Registry()


###############################################################################################

class A(Node):
    x = IntField(null=True)
    y = IntField(null=True)
    z = IntField(null=True)
    e = EmbeddedDocumentField(document_type=Node)


class A2(A):
    w = StringField(null=True, tags='q w e')


class B(Node):
    a = IntField(null=True)
    b = IntField(null=True)


def test1():
    a   = A(name='a'   , x= 3, y= 7,       )
    aa  = A(name='aa'  , x=31, y=71, e= a, owner=a.uri, )
    aaa = A(name='aaa' , x=31,       e=aa, owner=aa.uri, parent=aa,)
    ab  = A(name='ab'  , x=31, y=71, e= a, owner=a.uri, )

    #map(REG._put, (v for v in locals().values() if isinstance(v, Node)))

    print(aa.owner)

    globals().update(locals())


if __name__ == '__main__':
    db = connect(db='test_me')
    log.info('Use `test_me` db')

    test1()
