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


from uuid import uuid1 as get_uuid

from mongoengine import connect, Document, EmbeddedDocument
from mongoengine.fields import (
    IntField, StringField, UUIDField, ReferenceField, BooleanField,
    ListField, DictField, EmbeddedDocumentField,
    GenericReferenceField, BaseField,
)


class RegistryLinkField(BaseField):
    # def __init__(self, **kwargs):
    #     super(RegistryLinkField, self).__init__(**kwargs)

    def __get__(self, instance, owner):
        """Descriptor to allow lazy dereferencing."""
        if instance is None:  # Document class being used rather than a document object
            return self

        # Get value from document instance if available
        value = instance._data.get(self.name)

        return super(RegistryLinkField, self).__get__(instance, owner)

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


    def to_python(self, value):
        """Convert a MongoDB-compatible type to a Python type."""
        # todo: realization
        return value

    def prepare_query_value(self, op, value):
        if value is None:
            return None
        super(RegistryLinkField, self).prepare_query_value(op, value)
        return self.to_mongo(value)

    def validate(self, value):

        if not isinstance(value, (self.document_type, DBRef)):
            self.error('A ReferenceField only accepts DBRef or documents')

        if isinstance(value, Document) and value.id is None:
            self.error('You can only reference documents once they have been '
                       'saved to the database')

        if self.document_type._meta.get('abstract') and \
                not isinstance(value, self.document_type):
            self.error(
                '%s is not an instance of abstract reference type %s' % (
                    self.document_type._class_name)
            )

    def lookup_member(self, member_name):
        return self.document_type._fields.get(member_name)



class Node(EmbeddedDocument):
    meta = dict(
        allow_inheritance=True,
    )
    uri = StringField(unique=True, null=True, not_inherited=True)
    #owner = ReferenceField(document_type='self', not_inherited=True)  # todo: make it property
    #parent = ReferenceField(document_type='Node', not_inherited=True)
    parent = StringField()
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
    r = Node(name='registry')
    a = A(name='_a', x=3, y=7)
    a2 = A(name='_a2', x=31, y=71, e=a)

    globals().update(locals())



if __name__ == '__main__':
    db = connect(db='test_me')
    log.info('Use `test_me` db')

    test1()
